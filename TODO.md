# TODO

- [ ] Caching of account bot percentages
- [ ] List of confirmed bot accounts
- [ ] Proper popup page for the extension
- [ ] Add custom, user-created checks
  - [ ] Regex
- [ ] Make everything async so external checks (i.e. to an API) could be performed

## New Check Ideas

- [ ] "Dynamically weighted" checks?
  - [ ] Basically, the higher/lower the value, the more weight that the check has? Like the closer the bio
  - [ ] This would allow us to replace multiple step-based weights with a single continuous check.
- [ ] Have checks have an "unknown" state
  - [ ] Some checks might not be run for certain sites or could be disabled.
- [ ] Normalize unicode characters
- [ ] Check for
- [ ] Utilize Twitter-specific flags
  - [ ] Automated account
  - [x] Parody account
  - [ ] Sensitive account
- [ ] Info from account
  - [ ] Link promotion. Same expanded destination being promoted by several different accounts.
  - [ ] Posting bursts. Flag accounts with unusually many posts clustered into short intervals; requires timestamps for multiple posts by the same account.
  - [ ] Check for low
- [ ] Posts checks
  - [ ] Post engagement anomaly. Compare a post's views with likes, replies, and reposts to spot unusually lopsided engagement without relying only on account-wide totals.
  - [ ] Array of common phrases to flag. Lower weight.
