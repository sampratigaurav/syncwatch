1. **Optimize `WaitingRoom` to extract primitives instead of `participants` array.**
   - In `client/src/pages/WaitingRoom.tsx`, instead of returning the entire `participants` array from `useShallow`, we will extract `readyCount` and `participantCount`.
   - This prevents unnecessary re-renders of the large `WaitingRoom` component layout when socket pings update participant `latencyMs`.
2. **Optimize `Room` to extract buffering participant primitives.**
   - In `client/src/pages/Room.tsx`, replace `bufferingParticipant` object with `bufferingParticipantId` and `bufferingParticipantName` in the `useShallow` selector.
   - This prevents the main `Room` component from re-rendering when a buffering participant's ping changes.
3. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
4. **Submit PR for performance improvement.**
