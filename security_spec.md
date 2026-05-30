# Security Specification — FlowTalk AI Multi-Tenant & Subscription Rules

## 1. Data Invariants
*   **Identity Pinning**: Under no circumstances can a user register or update a profile with a `uid` that differs from their `request.auth.uid`.
*   **Immutable Role Protection**: Standard users cannot elevate their role to `isAdmin` or assign themselves additional credits without a corresponding verified ledger transaction.
*   **PII Privacy**: Personally identifiable data (emails, transaction histories, and custom API keys) must be shielded from global lookups. Only the account owner or authenticated admin can fetch them.
*   **Subscription States**: The transition or assignment of licensing levels (Free, Pro, Enterprise) must be verified by validated database actions or restricted to admin updates.
*   **Temporal Stability**: Created dates must be set only using atomic server times, and cannot be updated after creation.

---

## 2. The "Dirty Dozen" Attack Vectors (Mitigated)

1.  **UID Hijacking**: Attempting to create a user profile document at `/users/malicious_user` with `uid = 'victim_user'`.
2.  **Credit Injection**: A client attempts to patch `/users/{my_id}` setting `credits: 999999`.
3.  **Owner Spoofing**: Submitting a rewritten conversation log where `userId` is set to someone else.
4.  **Admin Escalation**: Attempting to patch user profile setting `isAdmin: true`.
5.  **State Bypassing**: Deleting billing history logs in the `transactions` collection.
6.  **Immortal Field Pollution**: Attempting to alter a document's `createdAt` timestamp to modify historical signup tracks.
7.  **Private Key Sniffing**: Attempting to execute a global query on `/users` to expose top-tier enterprise clients' private `customGeminiKey`.
8.  **Junk Character ID Attack**: Injecting 2MB character payload inside a document ID to crash parsing limits.
9.  **Email Fraud**: Claiming admin email identity while signing in with an unverified account (`email_verified == false`).
10. **Foreign Audit Pollution**: Inserting false documents inside the `/transactions` collection representing premium license purchases without clearing stripe sync tokens.
11. **Malicious Override**: Updating other users' saved chat logs.
12. **Null Token Impersonation**: Querying the database when unauthenticated and crawling collection lists.

---

## 3. Threat Matrix & Access Map

| Collection | Path | Create Policy | Read Policy | Update Policy | Delete Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Users** | `/users/{userId}` | `isOwner(userId)` | `isOwner(userId) \|\| isAdmin()` | Restrict roles/balances, except custom API key | `isAdmin()` |
| **Saved Conversations** | `/users/{userId}/saved_conversations/{id}` | `isOwner(userId)` | `isOwner(userId)` | `isOwner(userId)` | `isOwner(userId)` |
| **Transactions** | `/transactions/{id}` | `isSignedIn()` (Strict schema & verified buyer) | `isOwner(data.userId) \|\| isAdmin()` | Blocked | Blocked |
