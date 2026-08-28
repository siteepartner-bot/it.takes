# Firestore Security Specification - Aether Duo

## 1. Data Invariants
- A Room document must have a valid string `code` of at most 16 characters matching `^[a-zA-Z0-9_\-]+$`.
- Room stageId must be a positive integer corresponding to a valid puzzle stage.
- Room status must be one of: `waiting`, `ready`, `playing`, `cleared`.
- Room players map cannot exceed 2 active player identities (`explorer` and `guardian`).
- Documents outside `/rooms/{roomId}` are strictly locked by the global catch-all deny rule.

## 2. The Dirty Dozen Payloads (Designed to break Identity, Integrity, and State)
1. **Unregistered Collection Write**: Attempting to write to `/admin_secrets/passwords`. (Blocked by default-deny catch-all rule).
2. **Oversized Room Code**: Setting room code to a 10KB string to cause denial-of-wallet. (Blocked by `code.size() <= 16`).
3. **Invalid Room Status Injection**: Writing status `hacked_state` instead of valid enum. (Blocked by schema constraints).
4. **Root Path Traversal Write**: Writing to `/{document=**}`. (Blocked by default-deny catch-all).
5. **Delete Room Document**: Calling `deleteDoc(roomRef)` as client. (Blocked by `allow delete: if false`).
6. **Negative Stage ID**: Injecting `stageId: -999` to crash the client. (Enforced by state invariants).
7. **Malformed Player Slot**: Injecting arbitrary player role like `god_mode_player`. (Enforced by schema validation).
8. **Malicious Script in Emote**: Injecting `<script>alert(1)</script>` into emote event payload. (Sanitized by client and capped by size).
9. **Fake Ping Coordinates**: Injecting `Infinity` or non-numeric coordinates into ping events.
10. **State Spoofing without Room**: Emitting puzzle events without an existing room doc.
11. **Excessive Write Spamming**: Bombarding the room with multi-megabyte payloads. (Blocked by document size rules).
12. **Subcollection Hijack**: Creating unauthorized top-level collections. (Blocked by top-level deny).

## 3. Test Runner Invariant Summary
All untrusted writes to non-room paths or malformed room documents are rejected with `PERMISSION_DENIED`. Rooms allow real-time collaborative reads and updates between the two players participating in the session.
