import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import './MainPage.css';

const FLOORS = [
  { level: 1, label: 'Level 1' },
  { level: 2, label: 'Level 2' },
  { level: 3, label: 'Level 3' },
  { level: 4, label: 'Level 4' },
  { level: 5, label: 'Level 5' },
];

function getInitials(username) {
  if (!username || typeof username !== 'string') return '?';
  const s = username.trim();
  if (s.length === 0) return '?';
  if (s.length === 1) return s[0].toUpperCase();
  return (s[0] + s[s.length - 1]).toUpperCase();
}

/**
 * Main view (project.md §5): cartoon 5-story building with friends' initials
 * on each floor, plus controls for your status (here/not here, which floor).
 */
export default function MainPage({ user, onLogout }) {
  const [here, setHere] = useState(false);
  const [floor, setFloor] = useState(1);
  const [statusLoading, setStatusLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [friends, setFriends] = useState([]); // { id, username }[]
  const [pendingReceived, setPendingReceived] = useState([]); // { id, username, friendshipId }[]
  const [pendingSent, setPendingSent] = useState([]); // { id, username }[]
  const [friendsByFloor, setFriendsByFloor] = useState({}); // { 1: [{ id, username, initials }], ... }
  const [friendSearch, setFriendSearch] = useState('');
  const [searchResult, setSearchResult] = useState(null); // { id, username } | 'not_found' | 'self' | 'already_friends' | 'pending'
  const [searchError, setSearchError] = useState('');
  const [friendsActionLoading, setFriendsActionLoading] = useState(false);
  const friendsRef = useRef(friends);
  friendsRef.current = friends;

  // Load my saved status on mount
  useEffect(() => {
    if (!user?.id) return;
    async function load() {
      const { data } = await supabase
        .from('library_status')
        .select('at_library, floor')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setHere(data.at_library);
        setFloor(data.floor ?? 1);
      }
      setStatusLoading(false);
    }
    load();
  }, [user?.id]);

  // Persist status when here/floor changes
  useEffect(() => {
    if (!user?.id || statusLoading) return;
    supabase
      .from('library_status')
      .upsert(
        {
          user_id: user.id,
          at_library: here,
          floor: here ? floor : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .then(({ error }) => {
        if (error) console.error('Failed to save library status', error);
      });
  }, [user?.id, here, floor, statusLoading]);

  // Load friends and pending requests
  useEffect(() => {
    if (!user?.id) return;
    async function load() {
      const { data: rows } = await supabase
        .from('friendships')
        .select('id, from_user_id, to_user_id, status')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
      const friendIds = new Set();
      const pendingReceivedList = [];
      const pendingSentList = [];
      (rows || []).forEach((r) => {
        const otherId = r.from_user_id === user.id ? r.to_user_id : r.from_user_id;
        if (r.status === 'accepted') {
          friendIds.add(otherId);
        } else if (r.to_user_id === user.id) {
          pendingReceivedList.push({ friendshipId: r.id, fromUserId: r.from_user_id });
        } else {
          pendingSentList.push({ id: otherId });
        }
      });
      const allIds = [...friendIds, ...pendingReceivedList.map((p) => p.fromUserId), ...pendingSentList.map((p) => p.id)];
      if (allIds.length === 0) {
        setFriends([]);
        setPendingReceived([]);
        setPendingSent([]);
        return;
      }
      const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', allIds);
      const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      setFriends([...friendIds].map((id) => ({ id, username: byId[id]?.username ?? '?' })));
      setPendingReceived(pendingReceivedList.map((p) => ({ id: p.fromUserId, username: byId[p.fromUserId]?.username ?? '?', friendshipId: p.friendshipId })));
      setPendingSent(pendingSentList.map((p) => ({ id: p.id, username: byId[p.id]?.username ?? '?' })));
    }
    load();
  }, [user?.id]);

  // Load friends' library status for building
  useEffect(() => {
    if (!user?.id || friends.length === 0) {
      setFriendsByFloor({});
      return;
    }
    const friendIds = friends.map((f) => f.id);
    supabase
      .from('library_status')
      .select('user_id, floor')
      .in('user_id', friendIds)
      .eq('at_library', true)
      .then(({ data }) => {
        const byFloor = {};
        FLOORS.forEach((f) => { byFloor[f.level] = []; });
        const friendById = Object.fromEntries(friends.map((f) => [f.id, f]));
        (data || []).forEach((row) => {
          if (row.floor >= 1 && row.floor <= 5) {
            const p = friendById[row.user_id];
            if (p) byFloor[row.floor].push({ id: p.id, username: p.username, initials: getInitials(p.username) });
          }
        });
        setFriendsByFloor(byFloor);
      });
  }, [user?.id, friends]);

  // Realtime: update building when a friend changes their library status
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('library_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'library_status',
        },
        (payload) => {
          const record = payload.new ?? payload.old;
          const userId = record?.user_id;
          if (!userId || userId === user.id) return; // ignore our own updates (we update local state already)
          const friendList = friendsRef.current;
          const friend = friendList.find((f) => f.id === userId);
          if (!friend) return; // not a friend
          setFriendsByFloor((prev) => {
            const next = {};
            FLOORS.forEach((f) => {
              next[f.level] = (prev[f.level] || []).filter((p) => p.id !== userId);
            });
            const atLibrary = payload.new?.at_library;
            const floor = payload.new?.floor;
            if (atLibrary && floor >= 1 && floor <= 5) {
              next[floor].push({
                id: friend.id,
                username: friend.username,
                initials: getInitials(friend.username),
              });
            }
            return next;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function handleSendRequest() {
    const username = friendSearch.trim().toLowerCase();
    if (!username) return;
    setSearchError('');
    setSearchResult(null);
    setFriendsActionLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('id, username').ilike('username', username).maybeSingle();
      if (!profile) {
        setSearchResult('not_found');
        return;
      }
      if (profile.id === user.id) {
        setSearchResult('self');
        return;
      }
      const { data: existing1 } = await supabase.from('friendships').select('id, from_user_id, to_user_id, status').eq('from_user_id', user.id).eq('to_user_id', profile.id).maybeSingle();
      const { data: existing2 } = await supabase.from('friendships').select('id, from_user_id, to_user_id, status').eq('from_user_id', profile.id).eq('to_user_id', user.id).maybeSingle();
      const existing = existing1 || existing2;
      if (existing) {
        if (existing.status === 'accepted') setSearchResult('already_friends');
        else if (existing.from_user_id === user.id) setSearchResult('pending');
        else setSearchResult('accept_above');
        return;
      }
      const { error } = await supabase.from('friendships').insert({ from_user_id: user.id, to_user_id: profile.id, status: 'pending' });
      if (error) throw error;
      setSearchResult({ id: profile.id, username: profile.username });
      setFriendSearch('');
      setPendingSent((prev) => [...prev, { id: profile.id, username: profile.username }]);
    } catch (e) {
      setSearchError(e.message ?? 'Something went wrong');
    } finally {
      setFriendsActionLoading(false);
    }
  }

  async function handleAcceptRequest(friendshipId) {
    const accepted = pendingReceived.find((p) => p.friendshipId === friendshipId);
    setFriendsActionLoading(true);
    try {
      const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
      if (error) throw error;
      if (accepted) setFriends((f) => [...f, { id: accepted.id, username: accepted.username }]);
      setPendingReceived((prev) => prev.filter((p) => p.friendshipId !== friendshipId));
    } catch (e) {
      setSearchError(e.message ?? 'Something went wrong');
    } finally {
      setFriendsActionLoading(false);
    }
  }

  async function handleDeclineRequest(friendshipId) {
    setFriendsActionLoading(true);
    try {
      await supabase.from('friendships').delete().eq('id', friendshipId);
      setPendingReceived((prev) => prev.filter((p) => p.friendshipId !== friendshipId));
    } catch (e) {
      setSearchError(e.message ?? 'Something went wrong');
    } finally {
      setFriendsActionLoading(false);
    }
  }

  async function handleRemoveFriend(friendId) {
    setFriendsActionLoading(true);
    try {
      await supabase.from('friendships').delete().eq('from_user_id', user.id).eq('to_user_id', friendId);
      await supabase.from('friendships').delete().eq('from_user_id', friendId).eq('to_user_id', user.id);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
      setFriendsByFloor((prev) => {
        const next = {};
        Object.keys(prev).forEach((level) => { next[level] = prev[level].filter((p) => p.id !== friendId); });
        return next;
      });
    } catch (e) {
      setSearchError(e.message ?? 'Something went wrong');
    } finally {
      setFriendsActionLoading(false);
    }
  }

  // People on each floor: friends + me when I'm here (me first so I see myself)
  const peopleByFloor = {};
  FLOORS.forEach((f) => {
    peopleByFloor[f.level] = [...(friendsByFloor[f.level] || [])];
  });
  if (here && user) {
    const me = {
      id: user.id,
      username: user.username ?? 'you',
      initials: getInitials(user.username),
    };
    peopleByFloor[floor] = [me, ...(peopleByFloor[floor] || [])];
  }

  return (
    <div className="main-page">
      <header className="main-header">
        <span className="user">@{user?.username ?? 'you'}</span>
        <button type="button" className="logout" onClick={onLogout}>
          Sign out
        </button>
      </header>

      <section className="building-section">
        <div className="building-wrap">
          <div className="building-tree building-tree-left" aria-hidden="true" />
          <div className="building building-pixel">
          <div className="building-roof building-pixel-roof">
            <div className="building-sign">BYU LIBRARY</div>
          </div>
          <div className="building-body building-pixel-body">
            {[...FLOORS].reverse().map(({ level, label }) => {
              const count = peopleByFloor[level]?.length ?? 0;
              return (
                <button
                  key={level}
                  type="button"
                  className="floor floor-clickable"
                  onClick={() => setSelectedFloor(level)}
                  aria-label={`${label}, ${count} here. Tap to see who.`}
                >
                  <div className="floor-facade">
                    <span className="floor-label">{label}</span>
                    <div className="floor-windows">
                      {peopleByFloor[level]?.map((person) => (
                        <div
                          key={person.id}
                          className={`avatar ${person.id === user?.id ? 'avatar-me' : ''}`}
                          title={person.username}
                        >
                          {person.initials}
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="building-entrance" aria-hidden="true" />
          <div className="building-base building-pixel-base" aria-hidden="true" />
        </div>
          <div className="building-tree building-tree-right" aria-hidden="true" />
        </div>

        {selectedFloor != null && (
          <div
            className="floor-modal-backdrop"
            onClick={() => setSelectedFloor(null)}
            aria-hidden="false"
          >
            <div
              className="floor-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-labelledby="floor-modal-title"
            >
              <div className="floor-modal-header">
                <h3 id="floor-modal-title">
                  {FLOORS.find((f) => f.level === selectedFloor)?.label ?? `Level ${selectedFloor}`}
                </h3>
                <button
                  type="button"
                  className="floor-modal-close"
                  onClick={() => setSelectedFloor(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="floor-modal-list">
                {(peopleByFloor[selectedFloor] ?? []).length === 0 ? (
                  <p className="floor-modal-empty">No one here right now.</p>
                ) : (
                  (peopleByFloor[selectedFloor] ?? []).map((person) => (
                    <div key={person.id} className="floor-modal-person">
                      <div
                        className={`avatar ${person.id === user?.id ? 'avatar-me' : ''}`}
                        aria-hidden
                      >
                        {person.initials}
                      </div>
                      <span className="floor-modal-username">
                        @{person.username}
                        {person.id === user?.id && ' (you)'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="status-section">
        <h3>Your status</h3>
        <div className="status-controls">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={here}
              onChange={(e) => setHere(e.target.checked)}
            />
            <span>I&apos;m at the library</span>
          </label>
          {here && (
            <div className="floor-select">
              <label htmlFor="floor">Floor</label>
              <select
                id="floor"
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
              >
                {FLOORS.map((f) => (
                  <option key={f.level} value={f.level}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      <section className="friends-section">
        <h3>Friends</h3>
        <div className="friend-search">
          <input
            type="text"
            placeholder="Search by username"
            value={friendSearch}
            onChange={(e) => { setFriendSearch(e.target.value); setSearchResult(null); setSearchError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
          />
          <button type="button" onClick={handleSendRequest} disabled={friendsActionLoading || !friendSearch.trim()}>
            {friendsActionLoading ? '…' : 'Send request'}
          </button>
        </div>
        {searchError && <p className="friends-error">{searchError}</p>}
        {searchResult === 'not_found' && <p className="friends-message">No user with that username.</p>}
        {searchResult === 'self' && <p className="friends-message">That&apos;s you.</p>}
        {searchResult === 'already_friends' && <p className="friends-message">Already friends.</p>}
        {searchResult === 'pending' && <p className="friends-message">Request already sent.</p>}
        {searchResult === 'accept_above' && <p className="friends-message">They sent you a request — accept above.</p>}
        {searchResult && typeof searchResult === 'object' && <p className="friends-message friends-success">Request sent to @{searchResult.username}</p>}

        {pendingReceived.length > 0 && (
          <div className="friends-list-block">
            <h4>Requests</h4>
            <ul className="friends-list">
              {pendingReceived.map((p) => (
                <li key={p.friendshipId} className="friends-list-item">
                  <span>@{p.username}</span>
                  <span className="friends-list-actions">
                    <button type="button" className="btn-accept" onClick={() => handleAcceptRequest(p.friendshipId)} disabled={friendsActionLoading}>Accept</button>
                    <button type="button" className="btn-decline" onClick={() => handleDeclineRequest(p.friendshipId)} disabled={friendsActionLoading}>Decline</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {friends.length > 0 && (
          <div className="friends-list-block">
            <h4>Your friends</h4>
            <ul className="friends-list">
              {friends.map((f) => (
                <li key={f.id} className="friends-list-item">
                  <span>@{f.username}</span>
                  <button type="button" className="btn-remove" onClick={() => handleRemoveFriend(f.id)} disabled={friendsActionLoading}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {friends.length === 0 && pendingReceived.length === 0 && !searchResult && (
          <p className="muted">Add friends by username to see when they&apos;re at the library.</p>
        )}
      </section>
    </div>
  );
}
