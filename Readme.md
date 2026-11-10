# ServerLab: Windows Server 2019 install simulator (COC 3)

Open `index.html` in any browser. No install, no server, no build step.
Keep all five files in the same folder.

## Read the code in this order

| # | File | What it is | Edit it when you want to... |
|---|------|------------|-----------------------------|
| 1 | `index.html` | The empty page. Loads the fonts, the CSS and the three scripts. | change the page title |
| 2 | `data.js` | All the content: the 13 install steps, the editions list, the 10 quiz questions, badges, levels, sample classmates, `SL.PASS = 60`. | change wording, add quiz questions, change the pass mark |
| 3 | `logic.js` | The rules, with no screen code. `SL.check()` decides if a click is right or wrong and writes Patch's explanation. Also scoring, levels, badges, quiz marking, password hashing. | change what counts as right or wrong, or how points work |
| 4 | `ui.js` | Draws every screen (sign in, home, lesson, quiz, result, leaderboard, badges) and fake Windows Setup screens. Buttons use `data-act="..."` and one click handler passes them to `SL.check()`. | change a screen layout or add a new simulated screen |
| 5 | `style.css` | The look. Colour tokens are at the top (`:root`), dark mode right after. Phone and tablet rules are the `@media` blocks. | change colours, spacing, responsive behaviour |

`test.js` (optional): run `node test.js` to check the lesson rules, scoring and quiz without a browser.

## How the pieces fit

1. `ui.js` draws a step from `data.js`.
2. The student clicks. `ui.js` sends the click to `SL.check()` in `logic.js`.
3. `logic.js` answers `ok` (points), `bad` (Patch explains why), `local` (just changes the screen) or `nudge` (a greyed-out button was clicked).
4. `ui.js` shows Patch's reaction and saves progress.

## Points

- Lesson step: 10 points first try, 5 after a mistake or hint. Challenge mode doubles it (20 / 10).
- Assessment: 10 points for each correct answer, best attempt counts.
- Pass mark: 60%.
- Replaying a step never earns more than your best score for it.

## Adding COC 4 later

Add a new lesson in `data.js` (steps with `title`, `goal`, `hint`, `ok`), add its rules as a new `case` in `SL.check()` in `logic.js`, and add its screens to `ui.js`. The home screen already has a "COC 4" placeholder card.

## Known limit

Accounts, points and the leaderboard are saved in the browser (localStorage) on each device, so classmates on different computers do not see each other yet. The names marked "sample" are placeholders. A shared class leaderboard needs a small backend (for example Firebase or Supabase).