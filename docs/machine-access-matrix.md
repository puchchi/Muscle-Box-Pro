# Who can do what on a machine

Everything the admin machine console (`/machines`) can do today. Admins keep all of it.
The **F** (franchise owner), **G** (gym owner) and **O** (operator) columns say what each one gets.
Reviewed 2026-10-06.

- `x`: can change it
- `v`: can only see it
- empty: no access

A franchise owner, gym owner or operator only ever sees their own machines. A franchise sees the
machines at its gyms and the ones it holds unplaced. A gym sees its one machine. An operator sees
the machines they are assigned to.

The idea behind the recommendation:

- **Franchise** runs the business on its machines: menu prices, stock, day-to-day settings, sales.
- **Gym** hosts the machine: it sees how it's doing and its sales, and changes nothing.
- **Operator** keeps the machine working: stock, cleaning, testing. No money, no customer details.
- **Admin only**: anything that touches payments, security, refunds, customer data across
franchises, or every machine at once.



## Machines list


| Item                        | What it does                              | F   | G   | O   |
| --------------------------- | ----------------------------------------- | --- | --- | --- |
| Machines list               | Status, stock, owner, last seen, filters  | v   | v   | v   |
| Fleet health tiles          | Online, offline, faulty, low stock counts | v   | v   | v   |
| Orders and sales today tile | Today's totals                            | v   | v   |     |
| Add machine                 | Register a new machine (SN, model)        |     |     |     |
| Set factory PIN (bulk)      | One factory PIN on up to 100 machines     |     |     |     |




## Machine: Settings tab


| Item                         | What it does                                | F   | G   | O   |
| ---------------------------- | ------------------------------------------- | --- | --- | --- |
| Machine facts                | Model, hardware, first and last seen (view) | v   | v   | v   |
| Name                         | Machine name                                | x   | v   | v   |
| Machine Number               | External number, e.g. E01904                | v   |     | v   |
| Service phone                | Shown in the machine's header               | x   | v   | v   |
| Address, latitude, longitude | Where the machine is                        | x   | v   | v   |
| Hot water max and min        | 40 to 98 °C                                 | x   |     | v   |
| Cold water max and min       | 1 to 25 °C                                  | x   |     | v   |
| Enabled                      | A disabled machine refuses service          | x   |     | x   |
| QR payment                   | UPI QR payment on the machine               | v   |     |     |
| Free vend                    | Drinks are free, recorded as free orders    | v   |     |     |


Operators can turn a broken machine off. QR payment and free vend stay with admins, because
they decide whether the machine takes money.

## Machine: Owner tab


| Item                      | What it does                             | F   | G   | O   |
| ------------------------- | ---------------------------------------- | --- | --- | --- |
| Current owner and history | Gym, franchise, since, past moves (view) | v   | v   |     |
| Move machine              | To a gym, a franchise or MBP stock       |     |     |     |


Moving machines stays admin-only, as decided before (onboarding owns it).

## Machine: Goods tab (what this machine sells)


| Item                  | What it does                                  | F   | G   | O   |
| --------------------- | --------------------------------------------- | --- | --- | --- |
| Goods on this machine | Picture, name, price, sold out, rating (view) | v   | v   | v   |
| Add goods             | Add library goods to this machine             | x   |     |     |
| List and unlist       | Show or hide a drink on this machine          | x   |     | x   |
| Machine price         | Override the library price here               | x   |     |     |
| Sort                  | Order on the machine's screen                 | x   |     |     |


An operator can unlist a drink that isn't working, but can't change prices.

## Machine: Stock tab


| Item            | What it does                      | F   | G   | O   |
| --------------- | --------------------------------- | --- | --- | --- |
| Stock levels    | Current level per canister (view) | v   | v   | v   |
| Restock         | Add to, or correct, each canister | x   |     | x   |
| Restock history | Who restocked what, when (view)   | v   |     | v   |




## Machine: Voice prompts tab


| Item                   | What it does                          | F   | G   | O   |
| ---------------------- | ------------------------------------- | --- | --- | --- |
| This machine's prompts | Upload or remove its own five prompts | x   |     |     |




## Machine: PINs tab


| Item         | What it does                                         | F   | G   | O   |
| ------------ | ---------------------------------------------------- | --- | --- | --- |
| Operator PIN | Opens the operator screens on the machine            | x   |     |     |
| Factory PIN  | Opens Factory Settings (ports, server, payment mode) |     |     |     |


The franchise sets the on-machine operator PIN and gives it to its operators. The factory PIN can
change the server and payment mode, so it stays with admins.

## Machine: Remote control tab


| Item                        | What it does                               | F   | G   | O   |
| --------------------------- | ------------------------------------------ | --- | --- | --- |
| Connect and disconnect MQTT | Pair the tablet for remote control         |     |     |     |
| Clean pipes, reset track    | Cleaning, 1 to 5 times, optionally grounds | x   |     | x   |
| Open door, close door       |                                            | x   |     | x   |
| Lock                        |                                            | x   |     | x   |
| Unlock                      | Asks to confirm                            | x   |     | x   |
| Add water, empty            |                                            | x   |     | x   |
| Upload log                  | Machine sends a day's log                  |     |     |     |
| Re-read everything          | Machine reloads its settings and menu      | x   |     | x   |
| Restart app, reboot         | Asks to confirm                            | x   |     | x   |
| Live status                 | Faults, temperatures, door, cup, network   | v   |     | v   |


MQTT pairing issues a device certificate, so it stays with admins. Upload log is only useful with
the log files, which are admin-only.

## Machine: Files and logs


| Item                     | What it does                           | F   | G   | O   |
| ------------------------ | -------------------------------------- | --- | --- | --- |
| Log files, crash reports | Download (view)                        |     |     |     |
| Config backups           | View, compare (view)                   |     |     |     |
| Equipment log            | Faults over time (view)                | v   |     | v   |
| Operations log           | Restocks, logins on the machine (view) | v   |     | v   |




## Sales


| Item                             | What it does                                                | F   | G   | O   |
| -------------------------------- | ----------------------------------------------------------- | --- | --- | --- |
| Orders                           | Each drink sold, export CSV (view)                          | v   | v   |     |
| Statistics                       | Orders, sales, ads by day or month, export CSV (view)       | v   | v   |     |
| Feedback: read                   | Queries, reviews, complaints, with customer email and phone | v   |     |     |
| Feedback: reply state and note   | Mark New, Replied, Closed                                   | x   |     |     |
| Redeem codes: see                | Codes that work on their machines                           | v   |     |     |
| Redeem codes: add, edit, disable | Free-drink codes                                            | v   |     |     |
| Shop orders: see                 | Website drink orders for their machines                     | v   |     |     |
| Shop orders: refund, reissue     | Money goes back to the customer                             |     |     |     |
| Customers                        | Shop customers, stamps, balance                             |     |     |     |
| Customer balance refund          | Money goes back to the customer                             |     |     |     |


- A franchise sees the redeem codes that work on its machines, and can't add or change them.
- Shop customers aren't tied to one machine or franchise: one customer can buy anywhere, and
their balance is MBP's money. So customers and all refunds stay with admins.
- Gyms see their machine's orders and statistics, which the gym portal already plans to show as
sales. They don't see feedback, because it has customer contact details.



## Menu (shared across machines today)

These are fleet-wide. Giving them to a franchise means either letting it change every machine,
or building franchise-only copies.


| Item          | What it does                                   | F   | G   | O   |
| ------------- | ---------------------------------------------- | --- | --- | --- |
| Goods library | Drinks, pictures, recipes, library price       | v   |     |     |
| Materials     | Canister names, slots, capacity, warning level |     |     |     |
| Discounts     | Lower price for a time, on chosen machines     | v   |     |     |
| New products  | New-product promotion on chosen machines       |     |     |     |


A franchise picks from MBP's goods library and sets its own machine prices. It sees the discounts
running on its machines, and can't add or change them. Recipes and materials stay with MBP, because a wrong recipe makes a
bad drink on every machine.

## On screen (shared across machines today)


| Item                  | What it does                           | F   | G   | O   |
| --------------------- | -------------------------------------- | --- | --- | --- |
| Ads                   | Upload ads, choose machines and dates  |     |     |     |
| Default voice prompts | The five prompts every machine uses    |     |     |     |
| QR and logo           | Header logo, Join and Get Drinks links |     |     |     |


Ads earn MBP money, and the logo and links are the brand, so all of these stay with admins.

## Operator accounts

Decided:

1. **Who creates operator accounts?** Admins and franchise owners. A franchise creates operators
  for its own machines only.
2. **Can a gym owner create one?** No.
3. **How does an operator sign in?** With an operator ID, like `op_mbp_01`, and a password. Whoever
  creates the operator picks both. The form suggests the next free ID, and the ID can be edited before
  saving. An ID that is already taken is refused. Email and mobile are optional contact details and
  are never used to sign in. No invite or reset emails go to operators; the person who added them sets
  a new password on the Operators page. Decided 2026-10-12, replacing email invites. Backend spec:
  `machine-roles-backend-requirements.md` §12.
4. **One operator on many machines?** Yes. The franchise or an admin picks which machines each
  operator can use, and can remove an operator at any time.

## Where this lives in the dashboard

- The console reads `GET /machine-admin/me` and shows each role only the menu items, tabs, fields
  and buttons this matrix gives it. A page the role can't open shows "You don't have access".
- A franchise's dashboard is part of the console. Its Overview, Your record and Sales and payouts
  pages sit in a "Your franchise" group at the top of the sidebar, and a franchise signs in to its
  Overview. The dashboard opens on the franchise session, not on `/me`, because production has no
  `/me` yet and `/me` refuses a franchise that isn't active. When `/me` doesn't answer, the
  sidebar shows only those three pages. Gym owners still open the console from their dashboard, and see the link once their
  machine is installed.
- Everyone signs in to the console at `/machines/sign-in` with one form: an email or an operator ID, and a
  password. Anything with an `@` goes to the admin, franchise and gym sign-ins in that order, and the first
  that accepts the password wins. Anything else goes only to the operator sign-in (§12 of the backend
  requirements). The console then shows what `/me` says that role may see. Each type has its own attempt
  counter on the backend, so this doesn't lock anyone out sooner. Operator IDs are refused without a call
  where the backend has no operator routes, which is prod today; `OPERATOR_ACCOUNTS_LIVE` in
  `client/src/lib/machineConsoleSignIn.ts` is the switch to flip when it does. If the password is right but
  the console can't open for that role (prod has no `/me` yet), the form signs back out and says so.
- `/machines/forgot-password` asks the franchise and gym reset routes at once. Admins have no reset, and
  operators ask whoever added them for a new password. `/operator/login` and `/operator/forgot-password`
  redirect to the new pages.
- Admins and franchise owners manage operators at `/machines/operators`. Adding one fills in the
  suggested operator ID, which can be edited, and refuses an ID already on the list before asking the
  server. The password is typed or made with "Make one". Email and mobile are optional contact details.
  After adding an operator or changing a password, the page shows the ID and password once to hand over.
