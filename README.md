# Paletools Companion — feature summary

Paletools Companion is a Tampermonkey userscript that runs beside Paletools in the EA FC Ultimate Team web app. It does not change the Paletools script. It adds rules and tools for opening packs in bulk, deciding what each pull is worth, clearing a full transfer list, and using the cards that pile up in Squad Building Challenges.

The button labeled **Companion** sits at the bottom-right of the web app. Settings are split into Pack Opener, Players, Managers, Club scan, and SBC templates.

## Pack rules

Paletools asks for one action for every player, one for every manager, and one for every other item. That is too coarse once a session is opening many packs: users may want to treat players from different leagues in different ways or managers from special countries a certain way.

Companion hides those three Paletools menus and replaces them with one rules matrix. Every pull is routed from that matrix. The four actions are:


| Action                       | Purpose                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Club**                     | Keep a new item in the club. Duplicates cannot take this action, because the club already has a copy.                                            |
| **Quick sell**               | Turn the card into coins immediately. Used for items that will not sell.                                                                         |
| **Transfer list (unlisted)** | Put the card on the transfer list without listing it. Used for duplicates you may want in an SBC later, or for cards you are not ready to price. |
| **Dig+list (market)**        | Look up the current market value and list the card. Used when the card should actually sell.                                                     |


Players and managers are split four ways: new and important, new and other, duplicate and important, duplicate and other. “Important” means the card’s league or nation is checked in Companion. Paletools’ own important-league list is left alone.

The usual starting point is: new players go to the club, duplicate players from an important league or nation are listed, other duplicate players sit unlisted on the transfer list, important managers are listed, and other managers are quick sold.

## Player lists

The **Players** tab is two checklists, leagues and nations. Each row has a **Pack** checkbox and an **SBC** checkbox, because those two jobs are not the same.

**Pack** decides which player pulls count as important while packs are opening. A player is important when their league or their nation is checked. That is what sends a duplicate toward Dig+list instead of the unlisted transfer list.

**SBC** decides which leagues and nations to protect while completing SBCs. It is used only on a template step that has **Not Important Leagues Only** or **Not Important Nations Only** turned on. Duplicates from a checked league or nation can still be used if "Ignore Importance for Transfer List" or "Ignore Importance for SBC Storage" are checked. The last copy in the club stays out, so a challenge does not spend the only player you have from a league you are collecting.

Select all and Deselect all change the Pack column. The leagues you use most often are shown first; the rest stay alphabetical.

## Manager lists

The **Managers** tab is the same idea for manager cards: a league list and a nation list. A manager is important when their nation or their league is checked.

The purpose is to list the managers that actually sell and quick sell the rest. Manager cards are a small part of a pack, but treating every manager the same either dumps sellable ones or fills the transfer list with ones that will not move.

## Item handling

Everything that is not a player or a manager is grouped the way the club filters group it: **Club**, **Structure**, **Cosmetics**, and **Consumables**. Each group has one action for new items and one action for duplicates.

Most of these items are not worth a separate decision, so a group action is enough. A few types are worth different treatment. Stadiums are the usual example: a new stadium can go to the club, and a duplicate stadium can sit unlisted, while the rest of Structure is quick sold. Checking an item type pulls it out of the group and gives it its own row. A saved setup that already treated a type differently keeps that type checked.

The groups are:

- **Club** — kits, ball, celebrations, nickname, anthem, chants, goal song, badge
- **Structure** — stadium, theme, paint, seats, VIP area, goals, cannons, pitch lines, pitch patterns
- **Cosmetics** — tifos, banners, trophies, crowd cards
- **Consumables** — chemistry styles, manager league items, healing

An item the companion does not recognize uses the Club group action, and the shape is logged once so it can be added later.

## Undercut-safe pricing

Dig+list uses Paletools’ find-lowest search, the same lookup as the **V** hotkey, then applies **Min cheaper listings (undercuts)** from Companion.

The undercut setting walks up the price ladder until it finds a buy-now price that already has at least N cheaper listings underneath it. The default is 3. With 2 listings at 200, 1 at 250, and 3 at 300, the card is listed at 300. Setting the value to 0 lists at the current lowest price.

Listings last one hour. The start price is one market step below the buy-now price.

## Pacing

Market searches, listings, transfer moves, and leftover quick sells are spaced with short random delays. A pack full of cards that need a price takes longer than a pack that is only quick sold. The delay exists so a long opening session is less likely to hit EA’s rate limit.

If a search or a listing returns a rate-limit or soft-ban signal, automated listing stops for the rest of that run.

## Pack Opener templates

A pack-opening setup is a pack, a currency, a count, a speed, a transfer-list-full choice, a free-space SBC, an undercut number, and a full set of action rules. Users may want completely different behavior when opening bronze packs compared to silver packs for example.

**Save Template** on the Pack Opener screen stores that setup under a name. Saving the same name again replaces it. Player and manager league and nation lists stay shared Companion settings. They are not stored on the template, because they describe the club you are building, not one pack.

On the Store page, **Pack Opener Templates** lists each saved setup. The saved pack count is the starting number; you can change it before **Start**. Start opens the pack list, selects the store tab that contains that pack, applies the template, and confirms. If the pack is not in the current store, the row says so and nothing starts.

## When the transfer list fills

Pack opening stops being useful once the transfer list has no free slots. Paletools can quick sell the overflow or stop. Companion adds **Free space and continue**.

When that option is selected and the list is full, Companion:

1. Clears sold items.
2. Optionally runs a free-space SBC, described below, to submit duplicate players and free their transfer-list copies.
3. Sends unlisted cards that are not duplicates to the club. Active listings and expired listings stay where they are. Unlisted non-player duplicates, such as kits, badges, and stadiums, also stay on the transfer list.
4. Continues opening if at least five slots were freed.
5. Stops if fewer than five slots were freed. Those cards stay unassigned. They are not quick sold.
6. If a later card cannot move because the list filled again, Companion clears space and moves it before the next pack.

A failed open, build, or submit is skipped. Sending cards to the club still runs. A rate limit during this cleanup stops the run the same way a rate limit during Dig+list does. A cleanup that fails is not retried until the next Pack Opener run.

### Free-space SBC

The dropdown under **Free space and continue** is optional. **None** skips it.

The list contains formation SBCs that already have a Paletools template, and streamlined SBCs that have a Companion template. Each option is shown by the challenge title.

A formation SBC is opened and built with Paletools’ **Build Using Template**. A streamlined SBC reads the unlisted players on the transfer list, finds the matching common and rare copies in the club, and submits those. A challenge that has not been started is started first. Completions repeat until the copies run out. A squad that is short of the score requirement is still submitted, and the next free-space run continues from the score that was saved. The point of the step is to use duplicate players so their unlisted transfer-list copies can move to the club, not to finish the challenge in one pass.

## Stop and follow a run

**Stop after this pack** appears on the right while Pack Opener is running. It finishes the pack that is already open, then halts and shows the normal results for the packs opened so far. It exists so you can leave a run without abandoning a half-processed pack.

A **Pack run summary** panel appears on the left while the run is going. It shows packs opened against the planned total, where players, managers, and other items went, and the coin result: coins spent, coins redeemed from packs (not currently working), quick-sell coins, the expected return from the transfer list after the 5% market tax, total earned back, and profit or loss for the run and per pack. Notable pulls are listed when the run has them. The panel is there so you can see whether the rules are doing what you intended before the session ends.

When the run finishes, Companion adds summary rows for players and managers that were listed, plus a detail panel with each auto-listed card: kind, name, rating, buy-now price, and start price.

## Club value scan

Mass pack opening can send a lot of badges, kits, tifos, and stadium items to the club. Almost all of them are listed on the market at the lowest allowed buy-now price, and that price already has a long queue of listings. A few of them are scarce enough to be worth keeping.

**Scan club list value** reads the club list you already filtered. For each item it opens the detail view, looks up the market, and either quick sells the item or leaves it.


| Result                                                                                         | What happens | Why                                                                                   |
| ---------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| Untradeable                                                                                    | Quick sell   | It cannot be sold on the market.                                                      |
| Tradeable, lowest buy-now is the listing floor, and more than N cards are already listed there | Quick sell   | The queue at the minimum price is too long to be worth a listing. The default N is 5. |
| Tradeable, fewer than N listings at the floor, or the lowest buy-now is above the floor        | Keep         | There is a chance the card sells above junk price.                                    |
| No current listings, or the lookup fails                                                       | Keep         | The price is unknown, so the card is not discarded.                                   |


Only the kept tradeable items with value remain. Later pack duplicates of these cards can be sent to transfer list with the knowledge that they have previously had value. The scan pages through the user selected filtered list from the club page on its own. **Stop club scan** ends it. If the market lookup or a quick sell returns a rate-limit signal, the scan stops immediately so further requests do not extend the lock. This has resulted in a soft-ban after checking the values of 800+ bronze club items.

The threshold N is set under Companion → **Club scan**.

## Squad Building Challenges



### Unlisted transfer-list sources

Paletools’ template builder can take players from SBC Storage and from the club. Companion adds **Unlisted Transfers** to that source list, alone and in combination with Storage and Club.

A card that is sitting unlisted on the transfer list cannot be placed into the squad directly. Doing that fails with “Failed to save changes to SBC Squad.” Companion uses the same idea as Paletools’ **Use transfer list players** button: it reads the unlisted cards, finds the matching copies in the club, and feeds those club copies to the builder. Active listings are ignored. The template’s rating, nation, and league filters still apply.

When a source mixes the transfer list with the club or storage, the transfer-list copies are taken first. Otherwise a cheapest-rating pick can skip the duplicates you were trying to use. **Unlisted Transfers** alone uses only those matching club copies.

After a challenge submits successfully, Companion clears the duplicate mark on the unlisted transfer-list copies of the players that were just used, and refreshes the transfer-list cache. **Send Non Duplicated To Club** can then move those cards into the club.

### Protecting players you want to keep

Two pairs of filters decide who is eligible.

**Important leagues only** and **important nations only** use Paletools’ own important lists.

**Not important leagues only** and **not important nations only** use the SBC column on Companion’s Players tab. Duplicates from a checked league or nation remain eligible. The last club copy does not. With both of those toggles off, the SBC column is ignored.

Each template step also has **Ignore Importance for Transfer List** and **Ignore Importance for SBC Storage**. Leave them off and cards from those piles follow the same importance rules as club players. Turn one on when you want every card from that pile to be usable, including duplicates whose club copy would otherwise be held back. The choice stays on that step. Pack Opener still looks only at the Pack checkbox.

### Streamlined SBC templates

Some SBC challenges do not use a formation. Each player has a score, and the challenge asks for a total. Paletools’ formation templates do not cover those. Companion stores a separate template per challenge under **SBC templates**. These templates are not written into Paletools’ template store.

Each step is a count of players plus the same kind of filters as a squad step: rating range, league, nation, importance, and source. Leave the count empty to keep taking players that fit until the score requirement is met, or until the work area is full. A number means exactly that many. Position, chemistry, same-club, and max-players are not part of these steps. Special cards are left out. Only standard common and rare cards are selected.

On the SBC challenge page, **Edit Template** opens the step editor and **Select from Template** checks the matching players in the work area that is already open. Neither button submits the challenge. **Select** in the Companion panel does the same thing: the work area has to be open already, the previous selection is cleared, the matching players are checked, and the progress bar is refreshed. The lowest scores inside a step are used after any unlisted club copies. If an exact count cannot be filled, nothing is selected. If an empty count cannot reach the requirement, the short total stays selected so you can decide what to do, and the search stops there instead of paging through the rest of the club.

**Refresh** loads SBC sets that are not already in memory, so a one-click challenge can appear in the dropdown.

The same templates are what free-space uses when the transfer list is full. On the challenge page, Select only fills the squad. During free-space, Companion submits the matching club copies, including a partial score, so duplicate players leave the transfer list.

## Debug log

**Copy debug log** on the Companion panel copies the last 400 companion messages from the current page load. It includes the free-space challenge, and each open, build, and submit line. It exists so a run that stopped early can be diagnosed without watching the console the whole time.
