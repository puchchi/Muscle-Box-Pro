# Muscle-Box-Pro — working notes for Claude

## Comments

Do not add comments unless they are absolutely necessary.

Necessary means: the code cannot be understood, or will be "corrected" back into a bug,
without the note. Typically that is a non-obvious constraint — a browser quirk, a legal or
API requirement, a deliberate choice that looks wrong.

Not necessary:

- restating what the code says (`// loop over the sections`)
- narrating a change or its history ("this used to be X, now it is Y")
- justifying an ordinary, readable decision
- section banners and decorative dividers in new code

Prefer a clearer name, a smaller function, or a test over a comment. When a comment is
warranted, keep it to a line or two.

Much of this repo predates this rule and is heavily commented. Leave those comments alone
unless the code under them changes; do not match their density in new code.
