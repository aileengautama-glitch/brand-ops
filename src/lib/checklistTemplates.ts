/**
 * Checklist templates.
 *
 * SHOOT is derived from the Notion "Production System — Shoots · Windows · Events"
 * page (Campaign and Ecomm, with-stylist and no-stylist variants). Rather than four
 * near-identical ~110-line lists, it is deliberately consolidated into ONE list with
 * conditional lines — the reduction the production brief already called for ("four
 * ~150-line variants → a single ~45-line list plus collapsed conditional blocks").
 * Toggle the conditions when applying and only the relevant lines are created.
 *
 * WINDOW and EVENT are derived from the production brief, not from Notion — that page
 * links out to the Store Window and Event templates but doesn't contain their
 * checklists. Their lead times come from the brief: venue 8–12 weeks, invites 4 weeks,
 * hero VM fabrication 10–12 weeks, large-format print 10–15 working days.
 *
 * Anchor rule throughout: pre-production and the day itself count back from the
 * shoot/event date; post-production and offline work count back from launch.
 */
import type { ChecklistTemplate, ChecklistCondition } from '@/types/checklist'

// ─── Shoot (Notion-derived, consolidated) ─────────────────────────────────────

const SHOOT: ChecklistTemplate = {
  key: 'shoot',
  label: 'Shoot — campaign / ecomm',
  module: 'shoot',
  description: 'One list with conditional lines — pick stylist and shoot type when applying.',
  source: 'Notion · Production System (Campaign + Ecomm, consolidated)',
  items: [
    // 1 — Lock the shape
    { key: 'creative-direction', label: 'Creative direction drafted and shared with founder', phase: '4+ weeks out — lock the shape', ownerRole: 'Creative', isGate: true, anchorType: 'shoot', offsetDays: 28 },
    { key: 'founder-signoff', label: 'Founder sign-off received', phase: '4+ weeks out — lock the shape', ownerRole: 'Creative', isGate: true, anchorType: 'shoot', offsetDays: 28 },
    { key: 'dates-hold', label: 'Shoot date, pre-style date and studio/location hold placed', phase: '4+ weeks out — lock the shape', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 28 },
    { key: 'usage-terms', label: 'Usage term, territory and channels confirmed in writing', description: 'Print usage matters later — window graphics and in-store collateral must be covered.', phase: '4+ weeks out — lock the shape', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 28 },
    { key: 'deliverables', label: 'Deliverables list confirmed with Marketing (organic, paid, web, motion)', phase: '4+ weeks out — lock the shape', ownerRole: 'Marketing', isGate: true, anchorType: 'shoot', offsetDays: 28 },
    { key: 'budget-approved', label: 'Budget built in the cost tracker and approved', phase: '4+ weeks out — lock the shape', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 28 },
    { key: 'crew-holds', label: 'Holds placed: photographer, H&MU artist, gaffer, digi tech', phase: '4+ weeks out — lock the shape', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 28 },
    { key: 'stylist-hold', label: 'Stylist hold placed', phase: '4+ weeks out — lock the shape', ownerRole: 'Producer', conditions: ['with-stylist'], isGate: true, anchorType: 'shoot', offsetDays: 28 },
    { key: 'wardrobe-owner', label: 'Wardrobe Owner and Assistant named, their day blocked out', description: 'No stylist means wardrobe is an internal job with real hours. One person cannot dress two models and run the day.', phase: '4+ weeks out — lock the shape', ownerRole: 'Producer', conditions: ['no-stylist'], isGate: true, anchorType: 'shoot', offsetDays: 28 },
    { key: 'talent-booked', label: 'Talent options presented, fees negotiated, talent booked', phase: '4+ weeks out — lock the shape', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 28 },
    { key: 'talent-confirms', label: 'Talent confirmations in writing (fee, super, usage, travel, overtime)', phase: '4+ weeks out — lock the shape', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 26 },
    { key: 'sku-list', label: 'Full SKU list pulled from the drop, with colourways and sizes', phase: '4+ weeks out — lock the shape', ownerRole: 'Producer', conditions: ['ecomm'], isGate: true, anchorType: 'shoot', offsetDays: 21 },
    { key: 'shots-per-sku', label: 'Shots per SKU agreed and a realistic SKUs-per-hour rate set', description: 'No stylist: assume 20–30% fewer SKUs per hour and lengthen the day.', phase: '4+ weeks out — lock the shape', ownerRole: 'Producer', conditions: ['ecomm'], isGate: true, anchorType: 'shoot', offsetDays: 21 },

    // 2 — Book & brief
    { key: 'crew-confirmed', label: 'All crew confirmed in writing with rate, call time, wrap and usage', phase: '3 weeks out — book & brief', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 21 },
    { key: 'stylist-briefed', label: 'Stylist briefed: direction, look count, product list, accessories budget', phase: '3 weeks out — book & brief', ownerRole: 'Creative', conditions: ['with-stylist'], isGate: true, anchorType: 'shoot', offsetDays: 21 },
    { key: 'internal-styling-rules', label: 'Internal styling direction written: references, colour stories, silhouette rules, what not to do', phase: '3 weeks out — book & brief', ownerRole: 'Creative', conditions: ['no-stylist'], isGate: true, anchorType: 'shoot', offsetDays: 21 },
    { key: 'accessories-buy', label: 'Accessories, footwear and denim gaps identified and ordered early enough to try on and return', phase: '3 weeks out — book & brief', ownerRole: 'Wardrobe', conditions: ['no-stylist'], isGate: true, anchorType: 'shoot', offsetDays: 21 },
    { key: 'hmu-briefed', label: 'H&MU artist briefed in full — including nails, fingers AND toes', description: 'Skin/hair/finish per model, nails (shape, length, colour, arrive bare?), hair accessories, touch-up expectations, kit split. Forward nail direction to the agency so talent arrives prepped.', phase: '3 weeks out — book & brief', ownerRole: 'Creative', isGate: true, anchorType: 'shoot', offsetDays: 21 },
    { key: 'recce', label: 'Location recce done or recce images received, shot spots mapped', phase: '3 weeks out — book & brief', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 21 },
    { key: 'location-rules', label: 'Location contact, access, house rules and restrictions documented', phase: '3 weeks out — book & brief', ownerRole: 'Producer' },
    { key: 'motion-approach', label: 'Motion vs stills approach confirmed with photographer and gaffer', phase: '3 weeks out — book & brief', ownerRole: 'Creative' },
    { key: 'social-concepts', label: 'Social and paid concepts drafted and time-costed per piece', phase: '3 weeks out — book & brief', ownerRole: 'Marketing' },
    { key: 'travel-booked', label: 'Travel and accommodation booked for interstate talent or crew', phase: '3 weeks out — book & brief', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 21 },
    { key: 'samples-located', label: 'Every sample physically located and confirmed in-house', phase: '3 weeks out — book & brief', ownerRole: 'Producer', conditions: ['ecomm'], isGate: true, anchorType: 'shoot', offsetDays: 14 },
    { key: 'product-qc', label: "Product QC'd: marks, loose threads, wrong labels, faulty samples pulled", phase: '3 weeks out — book & brief', ownerRole: 'Wardrobe', conditions: ['ecomm'] },
    { key: 'naming-convention', label: 'File naming convention agreed and written down; retouch spec sent to retoucher', phase: '3 weeks out — book & brief', ownerRole: 'Producer', conditions: ['ecomm'], isGate: true, anchorType: 'shoot', offsetDays: 14 },

    // 3 — Creative lock
    { key: 'shot-list', label: 'Shot list drafted with location spot, model, format and priority per shot', phase: '2 weeks out — creative lock', ownerRole: 'Creative', isGate: true, anchorType: 'shoot', offsetDays: 14 },
    { key: 'look-board', label: 'Look board built and mapped to the shot list', phase: '2 weeks out — creative lock', ownerRole: 'Creative', conditions: ['with-stylist'] },
    { key: 'looks-digital', label: 'Looks built digitally first (flat lays / garment library) and signed off before samples are pulled', phase: '2 weeks out — creative lock', ownerRole: 'Wardrobe', conditions: ['no-stylist'] },
    { key: 'hero-shots', label: 'Hero shots identified and flagged as non-negotiable', phase: '2 weeks out — creative lock', ownerRole: 'Creative', isGate: true, anchorType: 'shoot', offsetDays: 14 },
    { key: 'social-time', label: 'Dedicated social time in the schedule — minimum 30–45 minutes', description: 'Blocked out or spread through the day. This is the first thing sacrificed when running behind, so it goes in the schedule now.', phase: '2 weeks out — creative lock', ownerRole: 'Marketing', isGate: true, anchorType: 'shoot', offsetDays: 14 },
    { key: 'product-list', label: 'Product list finalised: styles, colourways, sizes, samples confirmed in-house', phase: '2 weeks out — creative lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 14 },
    { key: 'sizes-vs-measurements', label: 'Sizes checked against talent measurements from the agency — every look, every model', phase: '2 weeks out — creative lock', ownerRole: 'Wardrobe', conditions: ['no-stylist'] },
    { key: 'late-samples', label: 'Missing or late samples flagged with a decision date', phase: '2 weeks out — creative lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 14 },
    { key: 'props-list', label: 'Props and set dressing list confirmed, sourced or bought', phase: '2 weeks out — creative lock', ownerRole: 'Producer' },
    { key: 'brief-internal', label: 'Full internal creative brief built and circulated to internal crew', phase: '2 weeks out — creative lock', ownerRole: 'Creative', isGate: true, anchorType: 'shoot', offsetDays: 14 },
    { key: 'brief-external', label: 'Top-line external brief sent to photographer, stylist, H&MU, gaffer', phase: '2 weeks out — creative lock', ownerRole: 'Creative', isGate: true, anchorType: 'shoot', offsetDays: 14 },

    // 4 — Logistics lock
    { key: 'dietaries', label: 'Dietaries and allergies collected from every person on set', description: 'Crew, talent and external. Logged on the call sheet.', phase: '1 week out — logistics lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'catering', label: 'Catering booked and paid ahead of time', phase: '1 week out — logistics lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'breakfast', label: 'Crew on set before 8am? Breakfast arranged', phase: '1 week out — logistics lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'water', label: 'Water arranged for location, or BYO instruction on the call sheet', phase: '1 week out — logistics lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'snacks', label: 'Snacks, tea/coffee and cups organised for the full day', phase: '1 week out — logistics lock', ownerRole: 'Producer' },
    { key: 'racks-steamers', label: 'Racks and steamers — who is bringing them, and do they have a car', phase: '1 week out — logistics lock', ownerRole: 'Wardrobe', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'backup-steamer', label: 'Backup steamer or iron and board sourced — no stylist means no spare kit', phase: '1 week out — logistics lock', ownerRole: 'Wardrobe', conditions: ['no-stylist'] },
    { key: 'wardrobe-kit', label: 'Hangers, garment bags, clips, pins, tape, lint rollers, sewing kit packed', phase: '1 week out — logistics lock', ownerRole: 'Wardrobe', conditions: ['no-stylist'] },
    { key: 'product-transport', label: 'Product transport confirmed — who, which vehicle, what time', phase: '1 week out — logistics lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'props-transport', label: 'Props transport confirmed — who, which vehicle, what time', phase: '1 week out — logistics lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'equipment-transport', label: 'Equipment transport confirmed and load-in access checked', phase: '1 week out — logistics lock', ownerRole: 'Producer' },
    { key: 'robes', label: 'Robes and slippers pulled from the office and packed', description: 'Essential in winter — record who is packing them.', phase: '1 week out — logistics lock', ownerRole: 'Wardrobe', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'hmu-area', label: 'H&MU area on the floorplan: table, chairs for talent and artist, mirror, power, good light', phase: '1 week out — logistics lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'wardrobe-area', label: 'Wardrobe area identified: rack space, steamer power, full-length mirror, private change space', phase: '1 week out — logistics lock', ownerRole: 'Wardrobe' },
    { key: 'staging-area', label: 'Equipment/staging area identified, separate from talent areas', phase: '1 week out — logistics lock', ownerRole: 'Producer' },
    { key: 'climate', label: 'Heating or cooling for the space confirmed', phase: '1 week out — logistics lock', ownerRole: 'Producer' },
    { key: 'parking', label: 'Parking researched and written up: free vs paid, rates, pre-book links, unit base', phase: '1 week out — logistics lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'transport-public', label: 'Public transport option noted for anyone not driving', phase: '1 week out — logistics lock', ownerRole: 'Producer' },
    { key: 'model-mobiles', label: 'Direct mobile obtained for each model — not just the agent', phase: '1 week out — logistics lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'flight-times', label: 'Talent flight times added to the call sheet as an FYI for the crew', phase: '1 week out — logistics lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'transfers', label: 'Transfers/rideshare arranged for talent to and from airport or set', phase: '1 week out — logistics lock', ownerRole: 'Producer' },
    { key: 'run-of-day', label: 'Detailed run-of-day schedule built (per look, per shot, per block)', description: 'No stylist: add 5–10 minutes per change. Ecomm: target SKU count per block.', phase: '1 week out — logistics lock', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 7 },
    { key: 'first-aid', label: 'First aid kit located and packed', phase: '1 week out — logistics lock', ownerRole: 'Producer' },

    // 5 — Pre-style
    { key: 'prestyle-day', label: 'Full day blocked for pre-style with Wardrobe Owner and Assistant', phase: 'Pre-style day', ownerRole: 'Wardrobe', conditions: ['no-stylist'], isGate: true, anchorType: 'shoot', offsetDays: 2 },
    { key: 'steamed', label: 'Every garment steamed or pressed the day before — not on the morning', phase: 'Pre-style day', ownerRole: 'Wardrobe', isGate: true, anchorType: 'shoot', offsetDays: 1 },
    { key: 'looks-built', label: 'Every look built, photographed and named/numbered', phase: 'Pre-style day', ownerRole: 'Wardrobe' },
    { key: 'looks-mapped', label: 'Looks mapped against shot list and locations', phase: 'Pre-style day', ownerRole: 'Wardrobe' },
    { key: 'fit-issues', label: 'Size and fit issues resolved — hems, clips, backup sizes decided', phase: 'Pre-style day', ownerRole: 'Wardrobe' },
    { key: 'look-sheet', label: 'Look sheet built with a photo of every look, printed for the day', phase: 'Pre-style day', ownerRole: 'Wardrobe' },
    { key: 'looks-racked', label: 'Looks bagged, labelled and racked in shoot order, accessories bagged with each', phase: 'Pre-style day', ownerRole: 'Wardrobe' },

    // 6 — Final confirms
    { key: 'call-sheet-sent', label: 'Call sheet finalised and sent to all internal crew and external parties', phase: '48 hours out — final confirms', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 2 },
    { key: 'call-sheet-checked', label: 'Call sheet checked: parking, flight times, model direct numbers, dietaries, BYO water, nearest hospital, wet-weather plan', phase: '48 hours out — final confirms', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 2 },
    { key: 'receipt-confirmed', label: 'Every external party has replied to confirm receipt and call time', phase: '48 hours out — final confirms', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 2 },
    { key: 'agency-confirm', label: 'Talent agency confirmed talent, call time, travel and nail/grooming prep', phase: '48 hours out — final confirms', ownerRole: 'Producer' },
    { key: 'location-reconfirm', label: 'Location re-confirmed: access time, keys, alarm, out-time', phase: '48 hours out — final confirms', ownerRole: 'Producer' },
    { key: 'catering-reconfirm', label: 'Catering re-confirmed with delivery window and headcount', phase: '48 hours out — final confirms', ownerRole: 'Producer' },
    { key: 'costs-current', label: 'All costs current in the tracker, including a contingency line', description: 'So an overtime or unexpected-spend call can be made on the spot.', phase: '48 hours out — final confirms', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 2 },
    { key: 'overtime-rates', label: 'Overtime rates for every crew member and talent known and written down', phase: '48 hours out — final confirms', ownerRole: 'Producer' },
    { key: 'weather-plan', label: 'Weather checked and wet-weather / indoor backup plan documented', phase: '48 hours out — final confirms', ownerRole: 'Producer' },
    { key: 'checkoff-system', label: 'Look / shot check-off system set up, with one nominated person marking off', phase: '48 hours out — final confirms', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 2 },
    { key: 'kit-confirmed', label: 'Batteries, cards, drives, chargers, extension leads confirmed', phase: '48 hours out — final confirms', ownerRole: 'Photographer' },

    // 7 — Day before
    { key: 'call-sheet-resent', label: 'Call sheet re-sent as a reminder with the location pin', phase: 'Day before — pack & send', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 1 },
    { key: 'packed', label: 'Product, props, robes, slippers, steamer, racks packed and loaded', phase: 'Day before — pack & send', ownerRole: 'Wardrobe', isGate: true, anchorType: 'shoot', offsetDays: 1 },
    { key: 'printed-pack', label: 'Printed pack ready: call sheet, schedule, shot checklist, look sheet, key contacts', phase: 'Day before — pack & send', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 1 },
    { key: 'release-forms', label: 'Model release forms printed or digital link ready', phase: 'Day before — pack & send', ownerRole: 'Producer' },
    { key: 'petty-cash', label: 'Petty cash or card available for on-day spend', phase: 'Day before — pack & send', ownerRole: 'Producer' },
    { key: 'vehicle', label: 'Vehicle loading time and driver confirmed', phase: 'Day before — pack & send', ownerRole: 'Producer' },

    // 8 — Shoot day setup
    { key: 'owner-onsite', label: 'Owner of the day on site first, walks the space and confirms all zones', phase: 'Shoot day — arrival & setup', ownerRole: 'Producer' },
    { key: 'hmu-station', label: 'H&MU station set up before the artist arrives: table, chairs, mirror, power, light', phase: 'Shoot day — arrival & setup', ownerRole: 'Producer' },
    { key: 'wardrobe-setup', label: 'Wardrobe set up: racks in shoot order, steamer hot, private change space, mirror', phase: 'Shoot day — arrival & setup', ownerRole: 'Wardrobe' },
    { key: 'staging-setup', label: 'Equipment staging set, cables taped, walkways clear', phase: 'Shoot day — arrival & setup', ownerRole: 'Photographer' },
    { key: 'breakfast-out', label: 'Breakfast and coffee out before the first crew member arrives', phase: 'Shoot day — arrival & setup', ownerRole: 'Producer' },
    { key: 'water-visible', label: 'Water available and visible', phase: 'Shoot day — arrival & setup', ownerRole: 'Producer' },
    { key: 'robes-out', label: 'Robes and slippers laid out in the talent area', phase: 'Shoot day — arrival & setup', ownerRole: 'Wardrobe' },
    { key: 'tether-naming', label: 'Tether and digi station set, file naming convention set before the first frame', phase: 'Shoot day — arrival & setup', ownerRole: 'Photographer', conditions: ['ecomm'] },
    { key: 'printed-up', label: 'Printed schedule, look sheet and shot checklist pinned up', phase: 'Shoot day — arrival & setup', ownerRole: 'Producer' },
    { key: 'talent-greeted', label: 'Talent arrival confirmed and greeted, call sheet walked through', phase: 'Shoot day — arrival & setup', ownerRole: 'Producer' },

    // 9 — Running the day
    { key: 'first-look-check', label: 'Lighting and first look check completed before the first frame', phase: 'Running the day', ownerRole: 'Photographer' },
    { key: 'first-sku-approved', label: 'First SKU shot, checked on screen and approved for crop, exposure and colour', phase: 'Running the day', ownerRole: 'Photographer', conditions: ['ecomm'] },
    { key: 'ticking-off', label: 'Nominated person marking off looks and shots as they are captured', phase: 'Running the day', ownerRole: 'Producer' },
    { key: 'next-look-ready', label: 'Next look pulled and steamed while the current look is still shooting', phase: 'Running the day', ownerRole: 'Wardrobe', conditions: ['no-stylist'] },
    { key: 'wardrobe-watch', label: 'Someone other than the Wardrobe Owner watching wardrobe detail on set', phase: 'Running the day', ownerRole: 'Creative', conditions: ['no-stylist'] },
    { key: 'progress-checks', label: 'Progress checked against the schedule every 90 minutes — cuts decided early', phase: 'Running the day', ownerRole: 'Producer' },
    { key: 'cuts-marked', label: 'Cuts and additions marked on the shot checklist and photographed for the record', phase: 'Running the day', ownerRole: 'Producer' },
    { key: 'social-protected', label: 'Social time protected — not the first thing sacrificed when running behind', phase: 'Running the day', ownerRole: 'Marketing' },
    { key: 'breaks', label: 'Lunch and breaks taken on schedule, talent breaks respected', phase: 'Running the day', ownerRole: 'Producer' },
    { key: 'talent-warm', label: 'Talent kept warm between looks — robe, slippers, heater', phase: 'Running the day', ownerRole: 'Wardrobe' },
    { key: 'overtime-call', label: 'Overtime call made and communicated by a set time', phase: 'Running the day', ownerRole: 'Producer' },
    { key: 'spend-logged', label: 'Any unexpected spend approved against the tracker and logged on the spot', phase: 'Running the day', ownerRole: 'Producer' },
    { key: 'bts', label: 'BTS content captured for social throughout the day', phase: 'Running the day', ownerRole: 'Marketing' },
    { key: 'releases-signed', label: 'Model release forms signed', phase: 'Running the day', ownerRole: 'Producer' },

    // 10 — Wrap
    { key: 'heroes-confirmed', label: 'Final checklist reviewed — every hero shot confirmed captured before anyone leaves', phase: 'Wrap', ownerRole: 'Producer', isGate: true, anchorType: 'shoot', offsetDays: 0 },
    { key: 'sku-reconciled', label: 'SKU checklist reconciled against the shot count — nothing missed', phase: 'Wrap', ownerRole: 'Producer', conditions: ['ecomm'], isGate: true, anchorType: 'shoot', offsetDays: 0 },
    { key: 'backed-up', label: 'Data backed up on set to two drives before the digi tech leaves', phase: 'Wrap', ownerRole: 'Photographer', isGate: true, anchorType: 'shoot', offsetDays: 0 },
    { key: 'product-back', label: 'Product checked back garment by garment, re-bagged, damages photographed', phase: 'Wrap', ownerRole: 'Wardrobe' },
    { key: 'kit-packed', label: 'Props, robes, slippers, steamer, racks and wardrobe kit packed', phase: 'Wrap', ownerRole: 'Wardrobe' },
    { key: 'location-left', label: 'Location left as found, rubbish removed, damage checked and photographed', phase: 'Wrap', ownerRole: 'Producer' },
    { key: 'location-signoff', label: 'Location contact signed off and thanked, out-time met', phase: 'Wrap', ownerRole: 'Producer' },
    { key: 'talent-departed', label: 'Talent departure and travel confirmed', phase: 'Wrap', ownerRole: 'Producer' },

    // 11 — Post (launch-anchored)
    { key: 'files-delivered', label: 'Files delivered and confirmed received from photographer', phase: 'Post-shoot', ownerRole: 'Producer', isGate: true, anchorType: 'launch', offsetDays: 21 },
    { key: 'selects-deadline', label: 'Selects deadline agreed and diarised', phase: 'Post-shoot', ownerRole: 'Creative', isGate: true, anchorType: 'launch', offsetDays: 21 },
    { key: 'retouch-deadline', label: 'Retouch deadline confirmed against go-live', phase: 'Post-shoot', ownerRole: 'Producer', isGate: true, anchorType: 'launch', offsetDays: 14 },
    { key: 'product-returned', label: 'Product returned to warehouse or office, damages flagged', phase: 'Post-shoot', ownerRole: 'Wardrobe' },
    { key: 'accessories-returned', label: 'Purchased accessories and footwear returned within the return window', phase: 'Post-shoot', ownerRole: 'Wardrobe', conditions: ['no-stylist'] },
    { key: 'invoices', label: 'All invoices received, checked against quotes and paid or scheduled', phase: 'Post-shoot', ownerRole: 'Producer', isGate: true, anchorType: 'launch', offsetDays: 7 },
    { key: 'actuals', label: 'Final actual costs entered in the tracker against budget', phase: 'Post-shoot', ownerRole: 'Producer', isGate: true, anchorType: 'launch', offsetDays: 7 },
    { key: 'project-updated', label: 'Project page updated: status, deliverables, links to assets', phase: 'Post-shoot', ownerRole: 'Producer' },
    { key: 'thank-yous', label: 'Thank-yous sent to talent, crew and location', phase: 'Post-shoot', ownerRole: 'Producer' },
    { key: 'debrief', label: '15-minute debrief held and logged — what to change next time', description: 'Ecomm: log actual SKUs-per-hour. No stylist: note whether a stylist should be budgeted next time.', phase: 'Post-shoot', ownerRole: 'Producer', isGate: true, anchorType: 'launch', offsetDays: 5 },
  ],
}

// ─── Store window / VM (brief-derived) ────────────────────────────────────────

const WINDOW: ChecklistTemplate = {
  key: 'window',
  label: 'Store window / VM',
  module: 'event',
  description: 'Fabrication and print lead times are the whole game here.',
  source: 'Derived from the production brief (not on the Notion page)',
  items: [
    { key: 'w-concept', label: 'Window concept agreed and tiered (standard vs hero)', phase: 'Concept', ownerRole: 'Creative', isGate: true, anchorType: 'launch', offsetDays: 98 },
    { key: 'w-fabrication-decision', label: 'Hero VM fabrication decision made — 10–12 week lead time', description: 'A hero window committed inside its fabrication window cannot physically be produced.', phase: 'Concept', ownerRole: 'Producer', isGate: true, anchorType: 'launch', offsetDays: 84 },
    { key: 'w-budget', label: 'Window budget approved', phase: 'Concept', ownerRole: 'Producer', isGate: true, anchorType: 'launch', offsetDays: 84 },
    { key: 'w-supplier', label: 'Fabricator/supplier quoted and booked', phase: 'Build', ownerRole: 'Producer', isGate: true, anchorType: 'launch', offsetDays: 70 },
    { key: 'w-rights', label: 'Print usage rights validated for window graphics', description: 'Window graphics are a print usage — check the shoot rights cover it before artwork is produced.', phase: 'Build', ownerRole: 'Producer', isGate: true, anchorType: 'launch', offsetDays: 56 },
    { key: 'w-images', label: 'Window images selected and fast-tracked through retouch', description: 'Pick 2–3 window frames off the digi station on the shoot day — window artwork is due before campaign assets normally land.', phase: 'Build', ownerRole: 'Creative', isGate: true, anchorType: 'launch', offsetDays: 42 },
    { key: 'w-artwork', label: 'Artwork to print — large-format takes 10–15 working days', phase: 'Build', ownerRole: 'Creative', isGate: true, anchorType: 'launch', offsetDays: 28 },
    { key: 'w-delivery', label: 'Fabrication and print delivery confirmed to store', phase: 'Install', ownerRole: 'Producer', isGate: true, anchorType: 'event', offsetDays: 7 },
    { key: 'w-install-brief', label: 'Install brief and plan sent to store team, with a named installer', phase: 'Install', ownerRole: 'Producer', isGate: true, anchorType: 'event', offsetDays: 3 },
    { key: 'w-install', label: 'Window installed and signed off', phase: 'Install', ownerRole: 'Store', isGate: true, anchorType: 'event', offsetDays: 0 },
    { key: 'w-photo', label: 'Installed window photographed for the record and for social', phase: 'Install', ownerRole: 'Marketing' },
    { key: 'w-debrief', label: 'Debrief logged — cost, lead-time accuracy, what to change', phase: 'Close', ownerRole: 'Producer', isGate: true, anchorType: 'launch', offsetDays: 0 },
  ],
}

// ─── Event (brief-derived) ────────────────────────────────────────────────────

const EVENT: ChecklistTemplate = {
  key: 'event',
  label: 'Event',
  module: 'event',
  description: 'Purpose and lead times up front; a named owner on the night.',
  source: 'Derived from the production brief (not on the Notion page)',
  items: [
    { key: 'e-purpose', label: 'Purpose settled: press vs community vs sales', description: 'Guest list, budget and success measure all follow from this — decide it before anything is booked.', phase: 'Commit', ownerRole: 'Marketing', isGate: true, anchorType: 'event', offsetDays: 90 },
    { key: 'e-commit', label: 'Event formally committed — not a maybe', phase: 'Commit', ownerRole: 'Marketing', isGate: true, anchorType: 'event', offsetDays: 84 },
    { key: 'e-format', label: 'Format chosen from the repeatable event formats', description: 'Six events a year on a small budget only works if they are not each bespoke.', phase: 'Commit', ownerRole: 'Producer', isGate: true, anchorType: 'event', offsetDays: 84 },
    { key: 'e-budget', label: 'Budget built and approved, with a contingency line', phase: 'Commit', ownerRole: 'Producer', isGate: true, anchorType: 'event', offsetDays: 84 },
    { key: 'e-success', label: 'Success measure agreed (attendance, content, cost per head)', phase: 'Commit', ownerRole: 'Marketing', isGate: true, anchorType: 'event', offsetDays: 84 },
    { key: 'e-venue-shortlist', label: 'Venue options shortlisted and visited', phase: 'Book', ownerRole: 'Producer', isGate: true, anchorType: 'event', offsetDays: 70 },
    { key: 'e-venue', label: 'Venue booked — good venues go 8–12 weeks out', phase: 'Book', ownerRole: 'Producer', isGate: true, anchorType: 'event', offsetDays: 56 },
    { key: 'e-owner', label: 'Named owner of the night assigned', description: 'Not the person hosting and art directing. Someone owns supplier problems on the night.', phase: 'Book', ownerRole: 'Producer', isGate: true, anchorType: 'event', offsetDays: 42 },
    { key: 'e-suppliers', label: 'Suppliers booked: catering, drinks, AV, styling, photographer', phase: 'Book', ownerRole: 'Producer', isGate: true, anchorType: 'event', offsetDays: 42 },
    { key: 'e-guestlist', label: 'Guest list built against the agreed purpose', phase: 'Invite', ownerRole: 'Marketing', isGate: true, anchorType: 'event', offsetDays: 35 },
    { key: 'e-invite-design', label: 'Invite designed and copy approved', phase: 'Invite', ownerRole: 'Creative', isGate: true, anchorType: 'event', offsetDays: 32 },
    { key: 'e-invites-sent', label: 'Invites sent — they need ~4 weeks', phase: 'Invite', ownerRole: 'Marketing', isGate: true, anchorType: 'event', offsetDays: 28 },
    { key: 'e-rsvp', label: 'RSVPs tracked and chased', phase: 'Invite', ownerRole: 'Marketing', isGate: true, anchorType: 'event', offsetDays: 14 },
    { key: 'e-runsheet', label: 'Run sheet built with a named owner per block', phase: 'Lock', ownerRole: 'Producer', isGate: true, anchorType: 'event', offsetDays: 7 },
    { key: 'e-dietaries', label: 'Dietaries collected and passed to catering', phase: 'Lock', ownerRole: 'Producer', isGate: true, anchorType: 'event', offsetDays: 7 },
    { key: 'e-content-plan', label: 'Content plan agreed: what gets captured, by whom', phase: 'Lock', ownerRole: 'Marketing', isGate: true, anchorType: 'event', offsetDays: 7 },
    { key: 'e-briefed', label: 'Staff and suppliers briefed, arrival times confirmed', phase: 'Lock', ownerRole: 'Producer', isGate: true, anchorType: 'event', offsetDays: 2 },
    { key: 'e-onsite', label: 'On-site setup walked and signed off', phase: 'Event day', ownerRole: 'Producer' },
    { key: 'e-content-captured', label: 'Content captured against the plan', phase: 'Event day', ownerRole: 'Marketing' },
    { key: 'e-recap', label: 'Recap logged: attended vs invited, content captured, cost per head', description: 'Without this nothing improves between events.', phase: 'Close', ownerRole: 'Marketing', isGate: true, anchorType: 'event', offsetDays: 0 },
    { key: 'e-invoices', label: 'Invoices received and actual costs entered against budget', phase: 'Close', ownerRole: 'Producer', isGate: true, anchorType: 'launch', offsetDays: 0 },
  ],
}

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [SHOOT, WINDOW, EVENT]

export const templatesForModule = (module: 'shoot' | 'event') =>
  CHECKLIST_TEMPLATES.filter((t) => t.module === module)

export const templateByKey = (key: string) =>
  CHECKLIST_TEMPLATES.find((t) => t.key === key) ?? null

export const CONDITION_LABELS: Record<ChecklistCondition, string> = {
  'with-stylist': 'Stylist on set',
  'no-stylist':   'No stylist — internal wardrobe',
  campaign:       'Campaign',
  ecomm:          'Ecomm',
}

/**
 * Instantiate a template into per-project items.
 * Lines whose conditions don't match the active set are skipped.
 */
export function instantiateTemplate(
  template: ChecklistTemplate,
  conditions: ChecklistCondition[],
  makeId: () => string,
) {
  const active = new Set(conditions)
  return template.items
    .filter((item) => !item.conditions?.length || item.conditions.some((c) => active.has(c)))
    .map((item, i) => ({
      id: makeId(),
      label: item.label,
      description: item.description ?? '',
      phase: item.phase,
      owner: item.ownerRole ?? '',
      done: false,
      doneAt: '',
      isGate: !!item.isGate,
      anchorType: item.anchorType,
      offsetDays: item.offsetDays,
      templateKey: item.key,
      conditions: item.conditions,
      order: i * 100,
    }))
}
