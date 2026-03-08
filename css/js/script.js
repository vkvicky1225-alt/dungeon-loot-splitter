// ============================================================
// DUNGEON LOOT SPLITTER — Phase 2
// script.js
//
// Architectural principle: the loot array and the party size
// input are the ONLY sources of truth. The screen reflects
// them — it does not drive them. Every state change calls
// updateUI(), which is the sole place where totals are
// calculated and DOM content is updated.
//
// Function map:
//   addLoot()    — validates and pushes a new item into loot[]
//   removeLoot() — splices an item out of loot[] by index
//   splitLoot()  — Split Loot button handler (delegates to updateUI)
//   updateUI()   — recalculates everything and re-renders the DOM
// ============================================================


// ============================================================
// APPLICATION STATE
//
// Declared at module scope so it persists across all button
// clicks and input events for the lifetime of the page.
// Each element will be a plain object literal: { name, value, quantity }
// ============================================================
let loot = [];


// ============================================================
// updateUI()
//
// The central rendering function. Called after every state
// change. It is the ONLY place where:
//   - totals are calculated
//   - loot rows are rendered into the DOM
//   - the Split button is enabled or disabled
//   - results and empty-state sections are shown or hidden
//
// Nothing is ever calculated in a button handler directly.
// ============================================================
function updateUI() {

    // ----------------------------------------------------------
    // 1. CALCULATE TOTAL LOOT
    //
    // A traditional for loop accumulates value × quantity for
    // every item. Using value × quantity (rather than just value)
    // because a single loot entry can represent multiple units.
    // Starting total at 0 ensures a clean accumulation each call.
    // ----------------------------------------------------------
    let total = 0;
    for (let i = 0; i < loot.length; i++) {
        total += loot[i].value * loot[i].quantity;
    }

    // ----------------------------------------------------------
    // 2. READ AND VALIDATE PARTY SIZE
    //
    // parseInt is used because party members must be whole numbers.
    // isNaN check catches empty input or non-numeric strings.
    // partyValid drives both the Split button state and whether
    // the per-member split is calculated at all.
    // ----------------------------------------------------------
    let partySizeInput = document.getElementById("partySize");
    let partySize = parseInt(partySizeInput.value);
    let partyValid = !isNaN(partySize) && partySize >= 1;

    // ----------------------------------------------------------
    // 3. RENDER THE LOOT LIST
    //
    // Clearing innerHTML first removes any previously rendered
    // rows so we always render from scratch — this avoids
    // duplicate rows appearing when items are added or removed.
    //
    // A second traditional for loop builds one .loot-row per item.
    // display:contents on #lootRows lets the child divs participate
    // directly in the parent CSS Grid, keeping Name/Value/Qty/Remove
    // columns aligned with the header row above them.
    // ----------------------------------------------------------
    let lootRows = document.getElementById("lootRows");
    lootRows.innerHTML = "";

    for (let i = 0; i < loot.length; i++) {

        // Outer wrapper uses display:contents so its children
        // flow directly into the parent grid as grid items
        let row = document.createElement("div");
        row.className = "loot-row";
        row.setAttribute("role", "row");

        let nameCell = document.createElement("div");
        nameCell.className = "loot-cell";
        nameCell.setAttribute("role", "cell");
        nameCell.innerText = loot[i].name;

        let valueCell = document.createElement("div");
        valueCell.className = "loot-cell";
        valueCell.setAttribute("role", "cell");
        // toFixed(2) ensures consistent two-decimal currency display
        valueCell.innerText = "$" + loot[i].value.toFixed(2);

        let quantityCell = document.createElement("div");
        quantityCell.className = "loot-cell";
        quantityCell.setAttribute("role", "cell");
        quantityCell.innerText = loot[i].quantity;

        let actionCell = document.createElement("div");
        actionCell.className = "loot-cell loot-actions";
        actionCell.setAttribute("role", "cell");

        let removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.innerText = "Remove";
        // aria-label gives screen readers context — "Remove" alone
        // would be ambiguous if multiple rows exist
        removeBtn.setAttribute("aria-label", "Remove " + loot[i].name);

        // IIFE (immediately invoked function expression) creates a
        // new scope for each iteration so the closure captures the
        // correct index value. Without this, every Remove button
        // would reference the same variable i (pointing to loot.length
        // after the loop ends) — a classic closure-in-loop pitfall.
        removeBtn.addEventListener("click", (function(index) {
            return function() {
                removeLoot(index);
            };
        })(i));

        actionCell.appendChild(removeBtn);

        row.appendChild(nameCell);
        row.appendChild(valueCell);
        row.appendChild(quantityCell);
        row.appendChild(actionCell);

        lootRows.appendChild(row);
    }

    // ----------------------------------------------------------
    // 4. EMPTY STATE VISIBILITY
    //
    // When the array is empty, hide the table and total row so
    // a stale $0.00 total is never displayed. Show the plain-text
    // "No loot added" message instead.
    // All visibility changes use classList, never style properties,
    // so the CSS .hidden rule (display:none) does the actual hiding.
    // ----------------------------------------------------------
    let noLootMessage = document.getElementById("noLootMessage");
    let lootTable     = document.getElementById("lootTable");
    let totalRow      = document.getElementById("totalRow");

    if (loot.length === 0) {
        // Array is empty — show placeholder, hide data elements
        noLootMessage.classList.remove("hidden");
        lootTable.classList.add("hidden");
        totalRow.classList.add("hidden");
    } else {
        // Array has items — hide placeholder, show data elements
        noLootMessage.classList.add("hidden");
        lootTable.classList.remove("hidden");
        totalRow.classList.remove("hidden");
    }

    // Update the running total in the Loot List panel
    document.getElementById("totalLoot").innerText = total.toFixed(2);

    // ----------------------------------------------------------
    // 5. SPLIT CALCULATION AND RESULTS VISIBILITY
    //
    // Both conditions must be true for results to show:
    //   a) At least one item exists in the array
    //   b) Party size is a valid integer >= 1
    //
    // If either condition fails, results are hidden and the Split
    // button is disabled. This prevents the interface from ever
    // showing a divide-by-zero result or stale/invalid calculation.
    // ----------------------------------------------------------
    let splitResults = document.getElementById("splitResults");
    let splitPrompt  = document.getElementById("splitPrompt");
    let splitBtn     = document.getElementById("splitLootBtn");

    // stateValid is the single boolean gate for all result display
    let stateValid = loot.length > 0 && partyValid;

    if (stateValid) {
        // Both conditions met — calculate and display split
        let perMember = total / partySize;
        document.getElementById("splitTotal").innerText     = total.toFixed(2);
        document.getElementById("lootPerMember").innerText  = perMember.toFixed(2);

        splitResults.classList.remove("hidden");
        splitPrompt.classList.add("hidden");

        // Enable the button and sync its ARIA state for assistive tech
        splitBtn.disabled = false;
    } else {
        // Not ready — hide results and keep button disabled
        splitResults.classList.add("hidden");
        splitPrompt.classList.remove("hidden");

        splitBtn.disabled = true;
    }
}


// ============================================================
// addLoot()
//
// Called when the user clicks "Add Loot". Validates all three
// inputs before touching the array — invalid data must never
// reach the loot array (state integrity rule).
//
// Validation order matters: we check name first so the user
// gets the most actionable error at the top of the form.
// ============================================================
function addLoot() {

    let nameInput     = document.getElementById("lootName");
    let valueInput    = document.getElementById("lootValue");
    let quantityInput = document.getElementById("lootQuantity");
    let errorDiv      = document.getElementById("lootError");

    // Trim whitespace so "   " is treated as empty, not a valid name
    let name     = nameInput.value.trim();
    let value    = parseFloat(valueInput.value);
    let quantity = parseInt(quantityInput.value);

    // -- Validate: name must not be blank --
    if (name === "") {
        errorDiv.innerText = "Loot name cannot be empty.";
        errorDiv.classList.remove("hidden");
        return; // Early return prevents any array mutation
    }

    // -- Validate: value must be a real non-negative number --
    // isNaN catches empty input; value < 0 catches explicit negatives.
    // The HTML min="0" attribute helps but JS validation is the true gate.
    if (isNaN(value) || value < 0) {
        errorDiv.innerText = "Loot value must be a valid number (0 or greater).";
        errorDiv.classList.remove("hidden");
        return;
    }

    // -- Validate: quantity must be a whole number of at least 1 --
    // parseInt returns NaN for empty or non-numeric input.
    if (isNaN(quantity) || quantity < 1) {
        errorDiv.innerText = "Quantity must be 1 or greater.";
        errorDiv.classList.remove("hidden");
        return;
    }

    // All checks passed — clear any previous error message
    errorDiv.classList.add("hidden");
    errorDiv.innerText = "";

    // Push a plain object literal into the array.
    // Using an object (not separate variables) keeps name, value,
    // and quantity grouped together so the array stays structured.
    loot.push({
        name:     name,
        value:    value,
        quantity: quantity
    });

    // Reset inputs so the user can immediately add the next item
    nameInput.value     = "";
    valueInput.value    = "";
    quantityInput.value = "";
    nameInput.focus(); // Return focus to first field for keyboard users

    // State has changed — re-render everything through updateUI()
    updateUI();
}


// ============================================================
// removeLoot(index)
//
// Removes the item at the given position using splice().
// splice(index, 1) deletes exactly one element starting at index,
// shifting remaining items left — the array stays contiguous.
//
// updateUI() is called immediately so the screen reflects
// the updated array without any further user action.
// ============================================================
function removeLoot(index) {
    loot.splice(index, 1);
    updateUI();
}


// ============================================================
// splitLoot()
//
// Button handler for "Split Loot". Its only job is to validate
// party size and call updateUI(). It does NOT contain any
// calculation logic — that would duplicate what updateUI() already
// does, violating the single-source-of-truth principle.
// ============================================================
function splitLoot() {

    let partyInput = document.getElementById("partySize");
    let errorDiv   = document.getElementById("partySizeError");
    let partySize  = parseInt(partyInput.value);

    // Guard: if the user somehow clicks Split with bad party size,
    // show the error. updateUI() will also gate the results display,
    // but this gives the user explicit feedback on which field is wrong.
    if (isNaN(partySize) || partySize < 1) {
        errorDiv.classList.remove("hidden");
        return;
    }

    errorDiv.classList.add("hidden");

    // Delegate all calculation and rendering to updateUI()
    updateUI();
}


// ============================================================
// EVENT LISTENERS
//
// All listeners are registered here in script.js.
// No inline event handlers exist in index.html — this keeps
// HTML and JS concerns cleanly separated.
// ============================================================

// "Add Loot" button — triggers input validation then array push
document.getElementById("addLootBtn").addEventListener("click", addLoot);

// "Split Loot" button — delegates all calculation to updateUI()
document.getElementById("splitLootBtn").addEventListener("click", splitLoot);

// Party size input — fires on every keystroke via "input" event.
// This is what makes the split recalculate automatically:
// the user doesn't need to click Split after changing party size.
document.getElementById("partySize").addEventListener("input", function() {
    let errorDiv  = document.getElementById("partySizeError");
    let partySize = parseInt(this.value);

    // Show or hide the error immediately as the user types,
    // so they get real-time feedback without waiting for a button click
    if (isNaN(partySize) || partySize < 1) {
        errorDiv.classList.remove("hidden");
    } else {
        errorDiv.classList.add("hidden");
    }

    // Recalculate and re-render every time party size changes
    updateUI();
});


// ============================================================
// INITIAL RENDER
//
// Called once on page load to establish the correct empty state:
// - "No loot added" message visible
// - Loot table hidden
// - Split button disabled
// This prevents a flash of incorrect UI before any user interaction.
// ============================================================
updateUI();
