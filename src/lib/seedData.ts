import { generateId } from './utils'
import type { EventProject } from '@/types/event'
import type { ShootProject } from '@/types/shoot'
import type { MagazineProject } from '@/types/magazine'

// Fixed seed IDs so tasks can reference the right people
const EV_TM = {
  SC: 'seed-ev-tm-01',   // Sarah Chen
  MW: 'seed-ev-tm-02',   // Marcus Williams
  PP: 'seed-ev-tm-03',   // Priya Patel
  TA: 'seed-ev-tm-04',   // Tom Anderson
  LR: 'seed-ev-tm-05',   // Leila Rodriguez
}
const SH_CR = {
  YT: 'seed-sh-cr-01',   // Yuki Tanaka
  MR: 'seed-sh-cr-02',   // Marco Rossi
  AO: 'seed-sh-cr-03',   // Amara Osei
  JK: 'seed-sh-cr-04',   // Jade Kim
}
const SH_MD = {
  IL: 'seed-sh-md-01',   // Isabelle Laurent
  ZN: 'seed-sh-md-02',   // Zara Ndobe
  KP: 'seed-sh-md-03',   // Kenji Park
}

// ─── Event seed ───────────────────────────────────────────────────────────────

export function createSeedEventProjects(): EventProject[] {
  return [
    {
      id: 'seed-event-001',
      name: 'AW26 Brand Preview — Client Evening',
      description: 'Annual autumn/winter collection preview for press, buyers, and VIP clients.',
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-06-01T14:30:00.000Z',
      eventDate: '2026-09-15',
      venue: 'Salon Claude, 22 Rue de la Paix, Paris',
      runTime: '18:30 — 22:00',

      tasks: [
        {
          id: generateId(), title: 'Confirm venue and sign contract',
          description: 'Review venue contract, negotiate terms, and transfer 50% deposit.',
          status: 'done', priority: 'high', dueDate: '2026-05-01',
          assignedTo: EV_TM.SC, createdAt: '2026-04-01T09:00:00.000Z', updatedAt: '2026-04-30T16:00:00.000Z',
        },
        {
          id: generateId(), title: 'Develop event concept and visual identity',
          description: 'Brief designer on AW26 event aesthetic. Confirm colour palette, type, and spatial references.',
          status: 'done', priority: 'high', dueDate: '2026-05-15',
          assignedTo: EV_TM.MW, createdAt: '2026-04-01T09:00:00.000Z', updatedAt: '2026-05-13T11:00:00.000Z',
        },
        {
          id: generateId(), title: 'Send invitations to press and buyers',
          description: 'Finalise guest list with Communications. Send digital invitations. Track RSVPs.',
          status: 'in_progress', priority: 'high', dueDate: '2026-06-20',
          assignedTo: EV_TM.LR, createdAt: '2026-04-15T09:00:00.000Z', updatedAt: '2026-06-01T09:00:00.000Z',
        },
        {
          id: generateId(), title: 'Finalise catering and beverage selection',
          description: 'Confirm canapé menu, wine and cocktail list with Maison Traiteur. Cater for all dietary needs.',
          status: 'in_progress', priority: 'normal', dueDate: '2026-06-30',
          assignedTo: EV_TM.SC, createdAt: '2026-04-15T09:00:00.000Z', updatedAt: '2026-06-01T09:00:00.000Z',
        },
        {
          id: generateId(), title: 'Arrange AV, lighting, and production setup',
          description: 'Brief Eclipse Productions on lighting mood references. Confirm tech specs with venue.',
          status: 'todo', priority: 'high', dueDate: '2026-07-15',
          assignedTo: EV_TM.PP, createdAt: '2026-05-01T09:00:00.000Z', updatedAt: '2026-05-01T09:00:00.000Z',
        },
        {
          id: generateId(), title: 'Source floral installation and decor hire',
          description: 'Brief Atelier Blooms on spatial concept. Review proposals and sign off on centrepieces.',
          status: 'todo', priority: 'normal', dueDate: '2026-07-30',
          assignedTo: EV_TM.MW, createdAt: '2026-05-01T09:00:00.000Z', updatedAt: '2026-05-01T09:00:00.000Z',
        },
        {
          id: generateId(), title: 'Brief retail staff and distribute run sheet',
          description: 'Prepare event run sheet. Host walk-through with all floor staff 3 days prior.',
          status: 'todo', priority: 'normal', dueDate: '2026-09-10',
          assignedTo: EV_TM.TA, createdAt: '2026-05-15T09:00:00.000Z', updatedAt: '2026-05-15T09:00:00.000Z',
        },
        {
          id: generateId(), title: 'Coordinate guest arrival and seating flow',
          description: 'Confirm seating plan. Arrange name cards. Liaise with venue manager on guest flow.',
          status: 'todo', priority: 'normal', dueDate: '2026-09-12',
          assignedTo: EV_TM.LR, createdAt: '2026-05-15T09:00:00.000Z', updatedAt: '2026-05-15T09:00:00.000Z',
        },
      ],

      milestones: [
        {
          id: generateId(), title: 'Venue confirmed', date: '2026-04-28',
          description: 'Contract signed and deposit paid to Salon Claude.', notes: '', relatedTaskIds: [], order: 0,
        },
        {
          id: generateId(), title: 'Creative concept approved', date: '2026-05-20',
          description: 'Visual identity, spatial layout, and tone of voice signed off by Creative Director.', notes: '', relatedTaskIds: [], order: 1,
        },
        {
          id: generateId(), title: 'Invitations distributed', date: '2026-06-25',
          description: 'All digital invitations sent. RSVP tracking open.', notes: 'Follow up with priority guests by July 10.', relatedTaskIds: [], order: 2,
        },
        {
          id: generateId(), title: 'Final production brief issued', date: '2026-08-10',
          description: 'All vendors receive final brief packages. No changes after this date.', notes: '', relatedTaskIds: [], order: 3,
        },
        {
          id: generateId(), title: 'Event day', date: '2026-09-15',
          description: 'AW26 Brand Preview — Client Evening at Salon Claude.', notes: 'Setup begins 14:00. Doors 18:30.', relatedTaskIds: [], order: 4,
        },
      ],

      dayOfSlots: [
        { id: generateId(), timeStart: '14:00', timeEnd: '16:00', activity: 'Venue setup and styling installation', owner: 'Priya Patel', notes: 'Atelier Blooms on-site from 14:00.', order: 0 },
        { id: generateId(), timeStart: '16:00', timeEnd: '17:00', activity: 'AV test, lighting rig, and sound check', owner: 'Eclipse Productions', notes: 'Final cue sheet to be submitted by 15:30.', order: 1 },
        { id: generateId(), timeStart: '17:00', timeEnd: '18:00', activity: 'Staff briefing and venue walk-through', owner: 'Sarah Chen', notes: 'All staff on-site by 17:00.', order: 2 },
        { id: generateId(), timeStart: '18:30', timeEnd: '19:15', activity: 'Guest arrival and welcome drinks', owner: 'Leila Rodriguez', notes: 'Guests greeted at entrance. Cocktail hour in Foyer.', order: 3 },
        { id: generateId(), timeStart: '19:15', timeEnd: '21:30', activity: 'Collection presentation and seated dinner', owner: 'Sarah Chen', notes: 'Keynote by Creative Director at 19:30.', order: 4 },
        { id: generateId(), timeStart: '21:30', timeEnd: '22:00', activity: 'Networking close and guest departure', owner: 'Tom Anderson', notes: 'Gift bags distributed at exit.', order: 5 },
      ],

      totalBudget: 45000,
      budgetItems: [
        { id: generateId(), description: 'Venue hire — Salon Claude', category: 'Venue', supplier: 'Salon Claude', estimatedCost: 18000, actualCost: 18000, status: 'paid', notes: 'Includes setup and breakdown time.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-04-28T10:00:00.000Z' },
        { id: generateId(), description: 'Catering and beverages', category: 'Catering', supplier: 'Maison Traiteur', estimatedCost: 12000, actualCost: 0, status: 'pending', notes: 'Canapés + 3-course dinner + open bar. Quote received.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-05-01T10:00:00.000Z' },
        { id: generateId(), description: 'AV, lighting, and production', category: 'Production', supplier: 'Eclipse Productions', estimatedCost: 6500, actualCost: 0, status: 'pending', notes: 'Contract in review.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-05-01T10:00:00.000Z' },
        { id: generateId(), description: 'Floral installation and decor hire', category: 'Decor', supplier: 'Atelier Blooms', estimatedCost: 4000, actualCost: 0, status: 'pending', notes: 'Three centrepiece arrangements + entrance installation.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-05-10T10:00:00.000Z' },
        { id: generateId(), description: 'Photography and event video', category: 'Photography', supplier: 'Studio Lumière', estimatedCost: 3000, actualCost: 3000, status: 'paid', notes: 'Half-day rate. RAW files + selects within 5 business days.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-04-30T10:00:00.000Z' },
        { id: generateId(), description: 'Printed invitations and collateral', category: 'Print', supplier: 'Artprint Studio', estimatedCost: 900, actualCost: 820, status: 'paid', notes: '120 invitations + 30 event programs.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-04-20T10:00:00.000Z' },
        { id: generateId(), description: 'Gift bag curation and packaging', category: 'Gifts', supplier: 'Internal', estimatedCost: 400, actualCost: 0, status: 'pending', notes: 'Product selection TBC with merchandising.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-05-15T10:00:00.000Z' },
        { id: generateId(), description: 'Contingency', category: 'Misc', supplier: '', estimatedCost: 200, actualCost: 0, status: 'pending', notes: '', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-04-01T10:00:00.000Z' },
      ],

      vendors: [
        { id: generateId(), name: 'Salon Claude', category: 'Venue', contactInfo: 'events@salonclaude.fr · +33 1 42 00 00 00', status: 'confirmed', contractStatus: 'signed', notes: 'Primary contact: Hélène Morin. Venue capacity 180.', createdAt: '2026-04-01T09:00:00.000Z' },
        { id: generateId(), name: 'Maison Traiteur', category: 'Catering', contactInfo: 'contact@maisontraiteur.com · +33 1 43 00 11 22', status: 'confirmed', contractStatus: 'signed', notes: 'Menu finalisation call booked for 20 June.', createdAt: '2026-04-15T09:00:00.000Z' },
        { id: generateId(), name: 'Eclipse Productions', category: 'AV & Production', contactInfo: 'hello@eclipseprod.fr · +33 6 77 88 99 00', status: 'confirmed', contractStatus: 'sent', notes: 'Awaiting signed contract. Contact: Pierre Duval.', createdAt: '2026-04-20T09:00:00.000Z' },
        { id: generateId(), name: 'Atelier Blooms', category: 'Florals & Decor', contactInfo: 'studio@atelierbooms.fr · +33 6 12 34 56 78', status: 'confirmed', contractStatus: 'signed', notes: 'Mood references shared. Samples review 30 June.', createdAt: '2026-04-22T09:00:00.000Z' },
        { id: generateId(), name: 'Studio Lumière', category: 'Photography', contactInfo: 'book@studiolumiere.com · +33 6 98 76 54 32', status: 'confirmed', contractStatus: 'signed', notes: 'Shot list and access requirements confirmed.', createdAt: '2026-04-25T09:00:00.000Z' },
        { id: generateId(), name: 'Artprint Studio', category: 'Print', contactInfo: 'production@artprint.fr · +33 1 50 60 70 80', status: 'confirmed', contractStatus: 'signed', notes: 'Files delivered. Print confirmed, pickup 5 Sept.', createdAt: '2026-04-10T09:00:00.000Z' },
      ],

      teamMembers: [
        { id: EV_TM.SC, name: 'Sarah Chen', role: 'Creative Director', contact: 'sarah.chen@brand.com · +33 6 11 22 33 44', notes: 'Overall creative vision and final sign-offs.', createdAt: '2026-04-01T09:00:00.000Z' },
        { id: EV_TM.MW, name: 'Marcus Williams', role: 'Event Designer', contact: 'marcus.w@brand.com · +33 6 22 33 44 55', notes: 'Spatial concept, decor direction, and run-of-show aesthetics.', createdAt: '2026-04-01T09:00:00.000Z' },
        { id: EV_TM.PP, name: 'Priya Patel', role: 'Production Manager', contact: 'priya.p@brand.com · +33 6 33 44 55 66', notes: 'Vendor coordination, logistics, and on-the-day operations.', createdAt: '2026-04-01T09:00:00.000Z' },
        { id: EV_TM.TA, name: 'Tom Anderson', role: 'Brand Manager', contact: 'tom.a@brand.com · +33 6 44 55 66 77', notes: 'Retail staff briefings, brand guidelines, and collateral.', createdAt: '2026-04-01T09:00:00.000Z' },
        { id: EV_TM.LR, name: 'Leila Rodriguez', role: 'Press & Communications', contact: 'leila.r@brand.com · +33 6 55 66 77 88', notes: 'Guest list, invitations, RSVP management, press materials.', createdAt: '2026-04-01T09:00:00.000Z' },
      ],

      moodboardItems: [],
      referenceBlocks: [],
      sketchBlocks: [],
      collaterals: [],
      props: [],
      staffRoster: [
        { id: generateId(), name: 'Sarah Chen',      role: 'Creative Director',    hoursStart: '17:00', hoursEnd: '22:00' },
        { id: generateId(), name: 'Marcus Williams', role: 'Event Designer',        hoursStart: '14:00', hoursEnd: '22:00' },
        { id: generateId(), name: 'Priya Patel',     role: 'Production Manager',    hoursStart: '14:00', hoursEnd: '22:30' },
        { id: generateId(), name: 'Tom Anderson',    role: 'Brand Manager',         hoursStart: '17:00', hoursEnd: '22:00' },
        { id: generateId(), name: 'Leila Rodriguez', role: 'Press & Communications',hoursStart: '18:00', hoursEnd: '22:30' },
      ],
      tags: [
        { id: generateId(), label: 'Intimate' },
        { id: generateId(), label: 'Luxury' },
        { id: generateId(), label: 'Press & Buyers' },
        { id: generateId(), label: 'Evening' },
        { id: generateId(), label: 'AW26' },
        { id: generateId(), label: 'Paris' },
      ],
      colours: [
        { id: generateId(), hex: '#1C1C1E', label: 'Carbon' },
        { id: generateId(), hex: '#D4B483', label: 'Champagne' },
        { id: generateId(), hex: '#F5F0EA', label: 'Linen' },
        { id: generateId(), hex: '#2C4A3E', label: 'Forest' },
        { id: generateId(), hex: '#8C7B6B', label: 'Warm Taupe' },
      ],
    },
  ]
}

// ─── Shoot seed ───────────────────────────────────────────────────────────────

export function createSeedShootProjects(): ShootProject[] {
  return [
    {
      id: 'seed-shoot-001',
      name: 'AW26 Campaign — Solitude',
      description: 'Editorial and e-commerce campaign for the AW26 collection. Concept: architectural minimalism meets desert light.',
      createdAt: '2026-04-15T09:00:00.000Z',
      updatedAt: '2026-06-01T14:30:00.000Z',

      briefDetails: {
        shootType: 'Editorial + E-commerce',
        concept: 'Architectural minimalism — Solitude',
        client: 'Brand Creative',
        location: 'Studio Neutral, Berlin',
        callTime: '07:30',
        wrapTime: '18:00',
      },

      shootBrief: {
        overview: 'AW26 Campaign "Solitude" — a study in architectural restraint and human presence within minimalist environments. The collection speaks through texture, proportion, and stillness. Every frame should feel considered, not accidental.',
        creativeDirection: 'References: Agnes Martin, Tadao Ando, Hiroshi Sugimoto. Tone: quiet power. Palette: warm neutrals against stark geometry. Movement should feel controlled and intentional — no dynamic action. Models hold space, they do not perform.',
        wardrobe: 'Full AW26 collection supplied by brand. Key pieces: oversized wool coats, structured tailoring, textured knitwear. Shoes to be confirmed — clean minimal forms only, no visible branding. All garments pressed and steamed morning of shoot. Stylist to have one rail per model.',
        hairAndMakeup: 'Hair: sleek, architectural. No ornaments. Skin: natural, luminous, second-skin finish — no heavy contour or strong lip. Consistent look across all models. Reference images to be sent to HMU lead by August 1.',
        locations: 'Primary: Studio Neutral, Kreuzberg (white cyc + main studio space). Secondary: Rooftop location TBC — sunset light required for S05. Location scout scheduled for August 15.',
        additionalNotes: 'No phones on set. All selects to Creative Director within 48hrs. RAW files + final retouched images within 14 days. Print rights included. Digital usage rights TBC with agency.',
      },

      tasks: [
        {
          id: generateId(), title: 'Book studio and secure location permits',
          description: 'Confirm Studio Neutral for full day. Apply for rooftop location permit if required.',
          status: 'done', priority: 'high', dueDate: '2026-05-15',
          assignedTo: SH_CR.YT, createdAt: '2026-04-15T09:00:00.000Z', updatedAt: '2026-05-14T16:00:00.000Z',
        },
        {
          id: generateId(), title: 'Confirm crew and issue call sheets',
          description: 'Confirm Yuki, Amara, and Jade. Send preliminary call sheet with shoot overview.',
          status: 'done', priority: 'high', dueDate: '2026-05-20',
          assignedTo: SH_CR.MR, createdAt: '2026-04-15T09:00:00.000Z', updatedAt: '2026-05-19T12:00:00.000Z',
        },
        {
          id: generateId(), title: 'Source and confirm wardrobe from AW26 collection',
          description: 'Pull key pieces from collection. Coordinate with merchandising on availability. Confirm with brand.',
          status: 'in_progress', priority: 'high', dueDate: '2026-07-20',
          assignedTo: SH_CR.AO, createdAt: '2026-05-01T09:00:00.000Z', updatedAt: '2026-06-01T09:00:00.000Z',
        },
        {
          id: generateId(), title: 'Brief HMU team on look direction',
          description: 'Share mood references and creative direction with Jade. Confirm product list for shoot day.',
          status: 'in_progress', priority: 'normal', dueDate: '2026-07-30',
          assignedTo: SH_CR.JK, createdAt: '2026-05-01T09:00:00.000Z', updatedAt: '2026-06-01T09:00:00.000Z',
        },
        {
          id: generateId(), title: 'Finalise shot list and distribute to crew',
          description: 'Complete shot-by-shot breakdown. Include reference images, locations, and model assignments per shot.',
          status: 'todo', priority: 'high', dueDate: '2026-08-01',
          assignedTo: SH_CR.MR, createdAt: '2026-05-15T09:00:00.000Z', updatedAt: '2026-05-15T09:00:00.000Z',
        },
        {
          id: generateId(), title: 'Confirm model bookings and travel logistics',
          description: 'Book Isabelle, Zara, and Kenji through their agencies. Arrange Berlin accommodation and transfers.',
          status: 'todo', priority: 'high', dueDate: '2026-07-15',
          assignedTo: SH_CR.MR, createdAt: '2026-05-15T09:00:00.000Z', updatedAt: '2026-05-15T09:00:00.000Z',
        },
        {
          id: generateId(), title: 'Prepare D-day schedule and distribute crew packs',
          description: 'Compile final D-day timeline, call times per model, and location notes. Send crew packs 1 week prior.',
          status: 'todo', priority: 'normal', dueDate: '2026-08-15',
          assignedTo: SH_CR.MR, createdAt: '2026-05-20T09:00:00.000Z', updatedAt: '2026-05-20T09:00:00.000Z',
        },
        {
          id: generateId(), title: 'Arrange equipment rental',
          description: 'Confirm lens kit, lighting pack, and tethering setup with Precision Rentals. Collect day before.',
          status: 'todo', priority: 'normal', dueDate: '2026-08-20',
          assignedTo: SH_CR.YT, createdAt: '2026-05-20T09:00:00.000Z', updatedAt: '2026-05-20T09:00:00.000Z',
        },
      ],

      milestones: [
        {
          id: generateId(), title: 'Studio booked and crew confirmed', date: '2026-05-20',
          description: 'Studio Neutral confirmed for 22 Aug. Core crew contracted.', notes: '', relatedTaskIds: [], order: 0,
        },
        {
          id: generateId(), title: 'Creative concept and shot list approved', date: '2026-07-10',
          description: 'Final creative direction signed off. Shot list locked.', notes: '', relatedTaskIds: [], order: 1,
        },
        {
          id: generateId(), title: 'Wardrobe and HMU confirmed', date: '2026-08-01',
          description: 'All garments confirmed. HMU brief distributed. Model bookings finalised.', notes: '', relatedTaskIds: [], order: 2,
        },
        {
          id: generateId(), title: 'Crew packs distributed', date: '2026-08-15',
          description: 'Final D-day schedule, call sheets, and location info sent to all crew.', notes: '', relatedTaskIds: [], order: 3,
        },
        {
          id: generateId(), title: 'Shoot day', date: '2026-08-22',
          description: 'AW26 Campaign "Solitude" — full production day.', notes: 'Call time 07:30. Wrap 18:00.', relatedTaskIds: [], order: 4,
        },
      ],

      dayOfSlots: [
        { id: generateId(), timeStart: '07:30', timeEnd: '08:30', activity: 'Crew arrival, setup, and equipment check', owner: 'Yuki Tanaka', notes: 'Tether station set up before models arrive.', order: 0 },
        { id: generateId(), timeStart: '08:30', timeEnd: '09:00', activity: 'Model arrival — HMU begins (Isabelle)', owner: 'Jade Kim', notes: 'HMU prep for Isabelle. Others arrive at staggered call times.', order: 1 },
        { id: generateId(), timeStart: '09:00', timeEnd: '11:00', activity: 'S01 — Hero silhouette (white cyc)', owner: 'Yuki Tanaka', notes: 'All crew focus. No interruptions.', order: 2 },
        { id: generateId(), timeStart: '11:00', timeEnd: '12:00', activity: 'S02 — Texture close-ups (detail table)', owner: 'Yuki Tanaka', notes: 'No models required for S02.', order: 3 },
        { id: generateId(), timeStart: '12:00', timeEnd: '13:00', activity: 'Lunch break', owner: 'All crew', notes: 'Catering on-site. 1 hour hard break.', order: 4 },
        { id: generateId(), timeStart: '13:00', timeEnd: '18:00', activity: 'S03–S05 — Rooftop location (sunset window)', owner: 'Yuki Tanaka', notes: 'Travel to rooftop 13:00. Golden hour window 16:30–17:30 priority.', order: 5 },
      ],

      totalBudget: 28500,
      budgetItems: [
        { id: generateId(), description: 'Studio hire — Studio Neutral (full day)', category: 'Studio', supplier: 'Studio Neutral', estimatedCost: 8000, actualCost: 8000, status: 'paid', notes: 'Includes white cyc, main studio, and green room.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-05-01T10:00:00.000Z' },
        { id: generateId(), description: 'Photographer day rate — Yuki Tanaka', category: 'Photography', supplier: 'Yuki Tanaka Studio', estimatedCost: 4500, actualCost: 4500, status: 'paid', notes: 'Rate includes assistant. Usage rights separate.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-05-01T10:00:00.000Z' },
        { id: generateId(), description: 'Art Director day rate — Marco Rossi', category: 'Creative', supplier: 'Marco Rossi Creative', estimatedCost: 3000, actualCost: 0, status: 'pending', notes: '', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-05-01T10:00:00.000Z' },
        { id: generateId(), description: 'Stylist day rate — Amara Osei', category: 'Styling', supplier: 'Amara Osei Studio', estimatedCost: 2500, actualCost: 0, status: 'pending', notes: 'Includes prep day (50%).', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-05-01T10:00:00.000Z' },
        { id: generateId(), description: 'HMU team — Jade Kim + 1 assistant', category: 'HMU', supplier: 'Jade Kim Beauty', estimatedCost: 2400, actualCost: 0, status: 'pending', notes: 'Two artists across three models.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-05-01T10:00:00.000Z' },
        { id: generateId(), description: 'Model fees — 3 models (Isabelle, Zara, Kenji)', category: 'Talent', supplier: 'Various agencies', estimatedCost: 6000, actualCost: 0, status: 'pending', notes: 'Day rates per agency agreements. Usage rights included.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-05-01T10:00:00.000Z' },
        { id: generateId(), description: 'Equipment rental — lens kit + lighting pack', category: 'Equipment', supplier: 'Precision Rentals', estimatedCost: 1500, actualCost: 0, status: 'pending', notes: 'Pickup day prior. Return day after.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-05-10T10:00:00.000Z' },
        { id: generateId(), description: 'Catering on-set (crew + models)', category: 'Catering', supplier: 'Internal', estimatedCost: 600, actualCost: 0, status: 'pending', notes: 'Breakfast, lunch, and craft services.', invoiceFileName: '', invoiceFileId: '', createdAt: '2026-05-10T10:00:00.000Z' },
      ],

      vendors: [
        { id: generateId(), name: 'Studio Neutral', category: 'Studio', contactInfo: 'book@studioneutral.de · +49 30 123 456 78', status: 'confirmed', contractStatus: 'signed', notes: 'Full-day booking 22 Aug. Access from 07:00.', createdAt: '2026-05-01T09:00:00.000Z' },
        { id: generateId(), name: 'Talent Agency GROUP', category: 'Model Agency', contactInfo: 'bookings@tagroupberlin.com · +49 30 987 654 32', status: 'confirmed', contractStatus: 'sent', notes: 'Managing bookings for Isabelle and Zara. Kenji via Elite NY.', createdAt: '2026-05-10T09:00:00.000Z' },
        { id: generateId(), name: 'Precision Rentals', category: 'Equipment', contactInfo: 'gear@precisionrentals.de · +49 30 555 123 45', status: 'confirmed', contractStatus: 'sent', notes: 'Equipment list submitted. Collection confirmed for 21 Aug.', createdAt: '2026-05-15T09:00:00.000Z' },
        { id: generateId(), name: 'Atelier Prints Berlin', category: 'Print', contactInfo: 'hello@atelierprints.de · +49 30 444 567 89', status: 'shortlisted', contractStatus: 'not_sent', notes: 'For any on-set printed reference materials.', createdAt: '2026-05-20T09:00:00.000Z' },
      ],

      crewMembers: [
        { id: SH_CR.YT, name: 'Yuki Tanaka', role: 'Photographer', contact: 'yuki@yukitanaka.com · +81 80 1234 5678', notes: 'Brings own camera body. Requires tether setup and colour-calibrated monitor.', createdAt: '2026-04-15T09:00:00.000Z' },
        { id: SH_CR.MR, name: 'Marco Rossi', role: 'Art Director', contact: 'marco@marcorossicreative.com · +39 02 8765 4321', notes: 'Creative vision and on-set direction. Final say on framing and selects.', createdAt: '2026-04-15T09:00:00.000Z' },
        { id: SH_CR.AO, name: 'Amara Osei', role: 'Stylist', contact: 'amara@amaraosei.studio · +44 7700 900 123', notes: 'Wardrobe pull and steam confirmed for 21 Aug.', createdAt: '2026-04-15T09:00:00.000Z' },
        { id: SH_CR.JK, name: 'Jade Kim', role: 'HMU Lead', contact: 'jade@jadekim.beauty · +49 176 111 222 33', notes: 'Bringing own assistant. On-set from 08:30.', createdAt: '2026-04-15T09:00:00.000Z' },
      ],

      models: [
        { id: SH_MD.IL, name: 'Isabelle Laurent', agency: 'IMG Models Paris', imageId: '', height: '178 cm', shoeSize: '39', apparelSize: 'XS / S', dressSize: '36', generalMeasurements: 'Bust 83 · Waist 60 · Hip 88', notes: 'Fluent in French and English.', createdAt: '2026-05-10T09:00:00.000Z' },
        { id: SH_MD.ZN, name: 'Zara Ndobe', agency: 'Storm Models London', imageId: '', height: '180 cm', shoeSize: '40', apparelSize: 'XS', dressSize: '34', generalMeasurements: 'Bust 81 · Waist 58 · Hip 85', notes: '', createdAt: '2026-05-10T09:00:00.000Z' },
        { id: SH_MD.KP, name: 'Kenji Park', agency: 'Elite Models NY', imageId: '', height: '186 cm', shoeSize: '44', apparelSize: 'S / M', dressSize: 'N/A', generalMeasurements: 'Chest 92 · Waist 76 · Hip 94', notes: 'Based in Berlin. No travel required.', createdAt: '2026-05-10T09:00:00.000Z' },
      ],

      shots: [
        { id: generateId(), shotId: 'S01', name: 'Hero silhouette', description: 'Full-length hero shot. Model against clean white cyclorama. Strong silhouette of key outerwear piece. Minimal movement.', notes: 'Overexpose slightly for airy, minimal feel.', imageId: '', order: 0 },
        { id: generateId(), shotId: 'S02', name: 'Texture close-up', description: 'Macro detail shots of key fabrications and trims. No model. Pure product focus — knitwear stitch, coat lapel, trouser break.', notes: 'Use macro lens. Minimum 3 selects per garment.', imageId: '', order: 1 },
        { id: generateId(), shotId: 'S03', name: 'Movement series', description: 'Dynamic shots with controlled architectural movement. Layered looks. Model walks within defined spatial frame — no spontaneous posing.', notes: 'Use continuous shooting. Edit for deliberate stillness in post.', imageId: '', order: 2 },
        { id: generateId(), shotId: 'S04', name: 'Group composition', description: 'Multi-model structured group framing. All three models. Geometric arrangement. No eye contact with camera.', notes: 'Key reference: Irving Penn group studies.', imageId: '', order: 3 },
        { id: generateId(), shotId: 'S05', name: 'Campaign signature', description: 'Outdoor rooftop. Sunset light. Single model with key collection piece. Campaign-defining image — must feel iconic.', notes: 'Golden hour window 16:30–17:30. Have everything pre-set before light hits.', imageId: '', order: 4 },
      ],

      ddayRows: [
        { id: generateId(), imageCode: 'S01', imageId: '', referenceImageIds: [], location: 'Studio Neutral — White Cyc', timeStart: '09:00', timeEnd: '11:00', modelIds: [SH_MD.IL], stylingId: '', notes: 'Key outerwear looks. Min. 5 selects required.', order: 0 },
        { id: generateId(), imageCode: 'S02', imageId: '', referenceImageIds: [], location: 'Studio Neutral — Detail Table', timeStart: '11:00', timeEnd: '12:00', modelIds: [], stylingId: '', notes: 'No models. Product-only. Macro lens setup.', order: 1 },
        { id: generateId(), imageCode: 'S03', imageId: '', referenceImageIds: [], location: 'Studio Neutral — Main Studio', timeStart: '13:00', timeEnd: '14:30', modelIds: [SH_MD.IL, SH_MD.ZN, SH_MD.KP], stylingId: '', notes: 'All models. Movement direction by Marco.', order: 2 },
        { id: generateId(), imageCode: 'S04', imageId: '', referenceImageIds: [], location: 'Studio Neutral — Main Studio', timeStart: '14:30', timeEnd: '15:30', modelIds: [SH_MD.IL, SH_MD.ZN, SH_MD.KP], stylingId: '', notes: 'Group composition. Pre-set positions before rolling.', order: 3 },
        { id: generateId(), imageCode: 'S05', imageId: '', referenceImageIds: [], location: 'Rooftop — TBC', timeStart: '16:30', timeEnd: '17:30', modelIds: [SH_MD.ZN], stylingId: '', notes: 'Golden hour priority. Have everything pre-lit.', order: 4 },
      ],

      moodboardItems: [],
      briefMoodboardItems: [],
      wardrobeImages: [],
      hairAndMakeupImages: [],
      locationsImages: [],
      products: [],
      stylings: [],
      productCategories: ['Apparel', 'Accessories', 'Footwear', 'Skincare', 'Fragrance'],

      tags: [
        { id: generateId(), label: 'AW26' },
        { id: generateId(), label: 'Editorial' },
        { id: generateId(), label: 'Minimalism' },
        { id: generateId(), label: 'Architecture' },
        { id: generateId(), label: 'Desert Light' },
        { id: generateId(), label: 'Berlin' },
      ],
      colours: [
        { id: generateId(), hex: '#2E2E2E', label: 'Charcoal' },
        { id: generateId(), hex: '#C4B5A3', label: 'Warm Stone' },
        { id: generateId(), hex: '#F2EDE5', label: 'Cream' },
        { id: generateId(), hex: '#8B6F5E', label: 'Clay' },
        { id: generateId(), hex: '#4A5568', label: 'Slate' },
      ],
      props: [],
    },
  ]
}

// ─── Magazine seed ────────────────────────────────────────────────────────────

export function createSeedMagazineProjects(): MagazineProject[] {
  // Pre-generate article IDs so spreads + cross-links can reference them
  const ART = {
    FEATURE:    generateId(),
    INTERVIEW:  generateId(),
    MAKING_OF:  generateId(),
    COLUMN:     generateId(),
    AD:         generateId(),
  }
  // Pre-generate team member IDs so tasks + outreach can reference them
  const TM = {
    SC: 'seed-mag-tm-01',   // Sarah Chen — Creative Director
    MR: 'seed-mag-tm-02',   // Marco Rossi — Art Director
    CV: 'seed-mag-tm-03',   // Clara Voss  — Contributing Writer
    NK: 'seed-mag-tm-04',   // Nina Koch   — Columnist
  }
  // Pre-generate graphic + visual-project IDs so spread links can reference them
  const GFX = { COVER: generateId(), CONTENTS: generateId(), OPENER: generateId(), AD: generateId() }
  const VIS = { COVER: generateId(), ATELIER: generateId() }
  // Feature body extracted so a seeded comment can anchor to a real text range
  const FEATURE_BODY = 'There is a particular silence inside an atelier at eight in the morning — the hush before the first machine turns over, when the cutting tables are still bare and the light is flat and grey. It is in this silence that the real work of fashion begins, far from the noise of the show calendar.\n\nFor two decades the industry told itself that craft and commerce were opposing forces. This issue argues the opposite: that the most durable commercial propositions are now being built on the slowest, most deliberate techniques. [ateliers to confirm: Maison Lesage, plus one Berlin studio]\n\n[DRAFT — section on apprenticeship economics still to come. Need quotes from both ateliers before 25 July.]'
  const anchorIn = (text: string, quote: string) => {
    const start = text.indexOf(quote)
    return { start, end: start + quote.length, quote }
  }

  return [
    {
      id: 'seed-mag-001',
      name: 'AW26 Brand Magazine — Issue 12',
      description: 'Seasonal editorial magazine for press, community, and buyers. Concept: Craft & Commerce — the art of making, the business of selling.',
      editionNumber: 'Issue 12',
      publicationDate: '2026-10-15',
      theme: 'Craft & Commerce',
      status: 'production',
      notes: 'Issue 12 explores the intersection of artisan craft and commercial fashion production. We want every piece — editorial, feature, interview — to feel considered and purposeful. Tone: authoritative but warm. No trend pieces. Focus on longevity, technique, and the people behind the work.',
      createdAt: '2026-05-01T09:00:00.000Z',
      updatedAt: '2026-06-01T14:30:00.000Z',
      printFiles: [],

      teamMembers: [
        { id: TM.SC, name: 'Sarah Chen',  role: 'Creative Director',   email: 'sarah@brand.co',              createdAt: '2026-05-01T09:00:00.000Z' },
        { id: TM.MR, name: 'Marco Rossi', role: 'Art Director',         email: 'marco@marcorossicreative.com', createdAt: '2026-05-01T09:00:00.000Z' },
        { id: TM.CV, name: 'Clara Voss',  role: 'Contributing Writer',  email: 'clara@claravoss.de',           createdAt: '2026-05-01T09:00:00.000Z' },
        { id: TM.NK, name: 'Nina Koch',   role: 'Columnist',            email: 'nina@ninakoch.studio',         createdAt: '2026-05-10T09:00:00.000Z' },
      ],

      tasks: [
        {
          id: generateId(), title: 'Finalise issue brief and editorial line-up',
          description: 'Confirm all article commissions, issue theme, and overall tone of voice before production begins.',
          status: 'done', priority: 'high', dueDate: '2026-05-15',
          assignedTo: TM.SC, createdAt: '2026-05-01T09:00:00.000Z', updatedAt: '2026-05-14T16:00:00.000Z',
          section: 'Production', linkType: 'none', linkId: '', order: 0,
        },
        {
          id: generateId(), title: 'Commission all articles and confirm contributor fees',
          description: 'Issue written briefs to Clara Voss (feature + BTS) and Nina Koch (column). Confirm fee agreements.',
          status: 'done', priority: 'high', dueDate: '2026-05-20',
          assignedTo: TM.SC, createdAt: '2026-05-01T09:00:00.000Z', updatedAt: '2026-05-18T11:00:00.000Z',
          section: 'Writing', linkType: 'none', linkId: '', order: 1,
        },
        {
          id: generateId(), title: 'Brief Art Director on cover and spread concepts',
          description: 'Share Solitude campaign selects. Brief Marco on cover variants and interior layout grid.',
          status: 'in_progress', priority: 'high', dueDate: '2026-06-20',
          assignedTo: TM.SC, createdAt: '2026-05-15T09:00:00.000Z', updatedAt: '2026-06-05T09:00:00.000Z',
          section: 'Graphics', linkType: 'none', linkId: '', order: 2,
        },
        {
          id: generateId(), title: 'First draft — The New Craft (feature)',
          description: 'Submit first draft of 2,000-word feature. Include at least two atelier interviews. Target deadline: 25 July.',
          status: 'in_progress', priority: 'high', dueDate: '2026-07-25',
          assignedTo: TM.CV, createdAt: '2026-05-20T09:00:00.000Z', updatedAt: '2026-06-01T09:00:00.000Z',
          section: 'Writing', linkType: 'article', linkId: ART.FEATURE, order: 3,
        },
        {
          id: generateId(), title: 'First draft — The Making Of: AW26 (BTS piece)',
          description: 'Submit first draft of 800-word behind-the-scenes piece. Pull quotes from Yuki Tanaka and Marco Rossi.',
          status: 'in_progress', priority: 'normal', dueDate: '2026-07-25',
          assignedTo: TM.CV, createdAt: '2026-05-20T09:00:00.000Z', updatedAt: '2026-06-01T09:00:00.000Z',
          section: 'Writing', linkType: 'article', linkId: ART.MAKING_OF, order: 4,
        },
        {
          id: generateId(), title: 'Book Studio Lumière for interview portrait session',
          description: 'Coordinate date for Sarah Chen Q&A portrait session. Brief on look and location. Target: late July.',
          status: 'todo', priority: 'normal', dueDate: '2026-06-30',
          assignedTo: TM.MR, createdAt: '2026-05-15T09:00:00.000Z', updatedAt: '2026-05-15T09:00:00.000Z',
          section: 'Visual', linkType: 'article', linkId: ART.INTERVIEW, order: 5,
        },
        {
          id: generateId(), title: 'Chase hi-res artwork from Arc Fashion Group',
          description: 'Hi-res CMYK file with correct bleed (3mm) required for print. Invoice sent 1 June — follow up on PO.',
          status: 'todo', priority: 'high', dueDate: '2026-07-01',
          assignedTo: TM.SC, createdAt: '2026-06-05T09:00:00.000Z', updatedAt: '2026-06-05T09:00:00.000Z',
          section: 'Production', linkType: 'article', linkId: ART.AD, order: 6,
        },
        {
          id: generateId(), title: 'Layout review — all Issue 12 spreads',
          description: 'Review all laid-out spreads against editorial briefs. Mark revisions. Sign off before print deadline.',
          status: 'todo', priority: 'high', dueDate: '2026-09-01',
          assignedTo: TM.MR, createdAt: '2026-05-20T09:00:00.000Z', updatedAt: '2026-05-20T09:00:00.000Z',
          section: 'Spread', linkType: 'none', linkId: '', order: 7,
        },
      ],

      articles: [
        {
          id: ART.FEATURE,
          title: 'The New Craft',
          type: 'feature',
          author: 'Clara Voss',
          section: 'Features',
          brief: 'Explore the revival of artisan techniques in contemporary fashion. Interview 2+ ateliers. Angle: how handcraft is becoming a commercial differentiator, not just a romantic ideal. Lead with a single maker — find the human story first, then pull back to the broader industry.',
          wordCountTarget: 2000,
          wordCountActual: 400,
          deadline: '2026-07-25',
          status: 'drafting',
          notes: 'Explore the revival of artisan techniques in contemporary fashion production. Interview at least two ateliers.',
          assignedWriterId: TM.CV,
          body: FEATURE_BODY,
          approverId: TM.SC,
          approvedById: '',
          approvedByName: '',
          approvedAt: '',
          order: 0,
          createdAt: '2026-05-01T09:00:00.000Z',
        },
        {
          id: ART.INTERVIEW,
          title: 'In Conversation: Sarah Chen',
          type: 'interview',
          author: 'Editorial Team',
          section: 'Conversation',
          brief: 'Q&A format. Lead with the AW26 concept, then draw out the philosophy on restraint and longevity. End with a personal note — something she is making, reading, or collecting right now. Aim for warmth within precision.',
          wordCountTarget: 1500,
          wordCountActual: 0,
          deadline: '2026-08-01',
          status: 'idea',
          notes: 'Q&A with our Creative Director on the AW26 direction and the role of restraint in modern luxury.',
          assignedWriterId: '',
          body: '',
          approverId: TM.SC,
          approvedById: '',
          approvedByName: '',
          approvedAt: '',
          order: 1,
          createdAt: '2026-05-01T09:00:00.000Z',
        },
        {
          id: ART.MAKING_OF,
          title: 'The Making Of: AW26 Collection',
          type: 'article',
          author: 'Clara Voss',
          section: 'Behind the Scenes',
          brief: 'Behind-the-scenes narrative from the Solitude campaign shoot. Pull quotes from Yuki (photography intent) and Marco (visual direction). Aim for an insider, warm tone — not a press release. Show the decisions, not just the results.',
          wordCountTarget: 800,
          wordCountActual: 600,
          deadline: '2026-07-25',
          status: 'drafting',
          notes: 'Behind-the-scenes piece tied to campaign shoot. Pull quotes from Yuki and Marco.',
          assignedWriterId: TM.CV,
          body: 'The Solitude campaign was never meant to look easy. "We wanted the restraint to feel earned," says Yuki Tanaka, who shot the series over a single fourteen-hour day in Berlin.\n\n[BTS — to expand: the rooftop golden-hour window was only forty minutes. Marco on the decision to shoot S05 last, after the light had already started to go.]',
          approverId: TM.SC,
          approvedById: '',
          approvedByName: '',
          approvedAt: '',
          order: 2,
          createdAt: '2026-05-10T09:00:00.000Z',
        },
        {
          id: ART.COLUMN,
          title: 'Tailoring as Truth',
          type: 'column',
          author: 'Nina Koch',
          section: 'Opinion',
          brief: 'Opinion piece on the return of structure and precision in womenswear. Personal voice throughout. Reference 2–3 current collections or designers to anchor the argument. Under 700 words — tight and purposeful.',
          wordCountTarget: 600,
          wordCountActual: 620,
          deadline: '2026-07-10',
          status: 'review',
          notes: 'Opinion piece on the return of structure and precision in womenswear.',
          assignedWriterId: TM.NK,
          body: 'Structure is back, and with it a certain honesty. For seasons we dressed in apology — soft shoulders, forgiving drapes, clothes that asked nothing of the body and offered little in return. The new tailoring asks something of us again.\n\nThere is truth in a well-set sleeve. It cannot be faked or rushed; the canvas either floats or it does not. When a jacket is built rather than printed, it carries the evidence of decisions made by a human hand.\n\nThis is not nostalgia. It is a correction. The return of precision in womenswear is, finally, a return to respect — for the maker, for the wearer, and for the time that good clothes demand.',
          approverId: TM.SC,
          approvedById: '',
          approvedByName: '',
          approvedAt: '',
          order: 3,
          createdAt: '2026-05-10T09:00:00.000Z',
        },
        {
          id: ART.AD,
          title: 'Arc Fashion Group — Full Page',
          type: 'ad',
          author: '',
          section: 'Advertising',
          brief: '',
          wordCountTarget: 0,
          wordCountActual: 0,
          deadline: '',
          status: 'final',
          notes: 'Client-supplied artwork. CMYK PDF, bleed + 3mm. Received 2 June.',
          assignedWriterId: '',
          body: '',
          approverId: TM.SC,
          approvedById: 'user-sarah-chen',
          approvedByName: 'Sarah Chen',
          approvedAt: '2026-06-03T10:30:00.000Z',
          order: 4,
          createdAt: '2026-06-02T09:00:00.000Z',
        },
      ],

      moodTiles: [],

      visualProjects: [
        {
          id: VIS.COVER,
          name: 'AW26 Cover Shoot — Solitude',
          concept: 'Hero cover image. Single model, rooftop, golden-hour. Architectural restraint — quiet power.',
          status: 'shot',
          shootDate: '2026-08-22',
          location: 'Studio Neutral + rooftop, Berlin',
          assignedTo: TM.MR,
          articleId: '',
          shots: [
            { id: generateId(), title: 'Hero silhouette (white cyc)', description: 'Full-length, key outerwear. Slight overexposure for an airy feel.', status: 'shot', order: 0, createdAt: '2026-08-22T09:00:00.000Z' },
            { id: generateId(), title: 'Cover frame (rooftop, golden hour)', description: 'Campaign-defining image. 40-minute light window.', status: 'shot', order: 1, createdAt: '2026-08-22T09:00:00.000Z' },
            { id: generateId(), title: 'Texture detail set', description: 'Macro of knitwear + coat lapel for inside-cover.', status: 'planned', order: 2, createdAt: '2026-08-22T09:00:00.000Z' },
          ],
          resultLinks: [
            { id: generateId(), label: 'Dropbox — RAW + selects', url: 'https://www.dropbox.com/scl/fo/aw26-cover-selects' },
            { id: generateId(), label: 'Final retouched (cover)', url: 'https://www.dropbox.com/scl/fo/aw26-cover-final' },
          ],
          notes: 'Masthead treatment to be confirmed with CD. Retouch selects due within 14 days of shoot.',
          order: 0,
          createdAt: '2026-06-01T09:00:00.000Z',
          updatedAt: '2026-06-05T09:00:00.000Z',
        },
        {
          id: VIS.ATELIER,
          name: 'Atelier Portraits — The New Craft',
          concept: 'Documentary portraits of two ateliers to run alongside the feature. Available light, working hands, texture.',
          status: 'scheduled',
          shootDate: '2026-07-20',
          location: 'Maison Lesage, Paris',
          assignedTo: TM.MR,
          articleId: ART.FEATURE,
          shots: [
            { id: generateId(), title: 'Atelier wide — workspace', description: 'Establishing shot of the room at first light.', status: 'planned', order: 0, createdAt: '2026-06-04T09:00:00.000Z' },
            { id: generateId(), title: 'Hands at work (macro)', description: 'Embroidery + cutting. Shallow depth of field.', status: 'planned', order: 1, createdAt: '2026-06-04T09:00:00.000Z' },
            { id: generateId(), title: 'Maker portrait', description: 'Environmental portrait of the lead artisan.', status: 'planned', order: 2, createdAt: '2026-06-04T09:00:00.000Z' },
          ],
          resultLinks: [
            { id: generateId(), label: 'Dropbox — shoot folder', url: 'https://www.dropbox.com/scl/fo/new-craft-ateliers' },
          ],
          notes: 'Coordinate access with Clara (writer) — same-day as her interviews. Confirm second atelier (Berlin) date.',
          order: 1,
          createdAt: '2026-06-04T09:00:00.000Z',
          updatedAt: '2026-06-04T09:00:00.000Z',
        },
      ],

      graphics: [
        {
          id: GFX.COVER,
          title: 'Issue 12 Cover',
          formatDetail: 'A4 portrait · Print + Digital · 300 dpi',
          assignee: 'Marco Rossi',
          status: 'design',
          imageIds: [],
          brief: 'Use the Solitude campaign hero shot (Zara Ndobe, rooftop, golden hour). Masthead: white, upper left. No cover lines in first draft — explore the clean cover option. Present 2 variants: one full-bleed, one with a subtle border.',
          notes: 'Campaign hero image from Solitude shoot. Masthead treatment TBC with CD.',
          articleId: '',
          visualProjectId: VIS.COVER,
          moodTileId: '',
          previewImageId: '',
          dropboxLink: '',
          resultLinks: [
            { id: generateId(), label: 'Dropbox — cover working files', url: 'https://www.dropbox.com/scl/fo/issue12-cover-wip' },
          ],
          order: 0,
          createdAt: '2026-05-01T09:00:00.000Z',
        },
        {
          id: GFX.CONTENTS,
          title: 'Contents Page Layout',
          formatDetail: 'A4 portrait · Print',
          assignee: 'Marco Rossi',
          status: 'brief',
          imageIds: [],
          brief: 'Typographic grid only — no images. Map page numbers cleanly to section names. Should feel like an editorial object in its own right, not a functional index. Reference: Phaidon, Apartamento.',
          notes: 'Minimal typographic grid. No full-bleed imagery.',
          articleId: ART.MAKING_OF,
          visualProjectId: '',
          moodTileId: '',
          previewImageId: '',
          dropboxLink: '',
          resultLinks: [],
          order: 1,
          createdAt: '2026-05-01T09:00:00.000Z',
        },
        {
          id: GFX.OPENER,
          title: 'Editorial Opener Spread',
          formatDetail: 'A3 landscape double-page · Print',
          assignee: 'Marco Rossi',
          status: 'brief',
          imageIds: [],
          brief: '"The New Craft" double-page opener. Full-bleed hero image on left page. Article title + pull quote on right, white on dark. The image and text should hold tension across the gutter — this is the first impression of the editorial tone.',
          notes: 'Opening spread for "The New Craft" feature. Full-bleed hero image + pull-quote overlay.',
          articleId: ART.FEATURE,
          visualProjectId: VIS.ATELIER,
          moodTileId: '',
          previewImageId: '',
          dropboxLink: '',
          resultLinks: [],
          order: 2,
          createdAt: '2026-05-05T09:00:00.000Z',
        },
        {
          id: GFX.AD,
          title: 'Brand Ad — Full Page',
          formatDetail: 'A4 portrait · Print + Digital · Client supplied',
          assignee: 'Arc Fashion Group',
          status: 'review',
          imageIds: [],
          brief: 'Client-supplied artwork. Review only — confirm CMYK, correct bleed (3mm), and minimum 300 dpi. No design work required. Flag any issues to Sarah before passing to print.',
          notes: 'Awaiting hi-res CMYK file with correct bleed. Chased 5 June.',
          articleId: ART.AD,
          visualProjectId: '',
          moodTileId: '',
          previewImageId: '',
          dropboxLink: '',
          resultLinks: [],
          order: 3,
          createdAt: '2026-06-01T09:00:00.000Z',
        },
      ],

      graphicsInspo: [
        {
          id: generateId(), imageId: '',
          caption: 'Serif/sans masthead pairing — reference for cover lockup',
          sourceUrl: 'https://fontsinuse.com',
          order: 0, createdAt: '2026-05-02T09:00:00.000Z',
        },
        {
          id: generateId(), imageId: '',
          caption: 'Editorial grid — generous margins, single accent rule',
          sourceUrl: '',
          order: 1, createdAt: '2026-05-02T09:00:00.000Z',
        },
        {
          id: generateId(), imageId: '',
          caption: 'Muted AW palette — bone, ink, oxblood',
          sourceUrl: '',
          order: 2, createdAt: '2026-05-03T09:00:00.000Z',
        },
      ],

      spreads: [
        {
          id: generateId(),
          pages: 'Cover',
          contentType: 'editorial',
          section: 'Cover',
          ownerId: TM.MR,
          links: [
            { id: generateId(), type: 'graphic', refId: GFX.COVER },
            { id: generateId(), type: 'visual',  refId: VIS.COVER },
          ],
          status: 'laid-out',
          notes: 'Cover image locked pending final retouching from Yuki.',
          order: 0,
          createdAt: '2026-05-01T09:00:00.000Z',
        },
        {
          id: generateId(),
          pages: 'p.2–3',
          contentType: 'article',
          section: 'Front of Book',
          ownerId: TM.SC,
          links: [
            { id: generateId(), type: 'article', refId: ART.MAKING_OF },
            { id: generateId(), type: 'graphic', refId: GFX.CONTENTS },
          ],
          status: 'planned',
          notes: 'Contents page (p.2) + "Making Of" opener (p.3).',
          order: 1,
          createdAt: '2026-05-01T09:00:00.000Z',
        },
        {
          id: generateId(),
          pages: 'p.4–7',
          contentType: 'article',
          section: 'Features',
          ownerId: TM.MR,
          links: [
            { id: generateId(), type: 'article', refId: ART.FEATURE },
            { id: generateId(), type: 'graphic', refId: GFX.OPENER },
            { id: generateId(), type: 'visual',  refId: VIS.ATELIER },
          ],
          status: 'planned',
          notes: '"The New Craft" — 4-page feature with editorial imagery.',
          order: 2,
          createdAt: '2026-05-05T09:00:00.000Z',
        },
        {
          id: generateId(),
          pages: 'p.8–9',
          contentType: 'article',
          section: 'Features',
          ownerId: TM.SC,
          links: [
            { id: generateId(), type: 'article', refId: ART.INTERVIEW },
          ],
          status: 'empty',
          notes: 'Interview with Creative Director. Portrait photography TBC.',
          order: 3,
          createdAt: '2026-05-05T09:00:00.000Z',
        },
        {
          id: generateId(),
          pages: 'p.10',
          contentType: 'ad',
          section: 'Advertising',
          ownerId: TM.SC,
          links: [
            { id: generateId(), type: 'article', refId: ART.AD },
            { id: generateId(), type: 'graphic', refId: GFX.AD },
          ],
          status: 'empty',
          notes: 'Full-page Arc Fashion Group ad.',
          order: 4,
          createdAt: '2026-06-01T09:00:00.000Z',
        },
        {
          id: generateId(),
          pages: 'p.11',
          contentType: 'article',
          section: 'Opinion',
          ownerId: TM.NK,
          links: [
            { id: generateId(), type: 'article', refId: ART.COLUMN },
          ],
          status: 'empty',
          notes: '"Tailoring as Truth" column — single page, text-heavy layout.',
          order: 5,
          createdAt: '2026-05-10T09:00:00.000Z',
        },
      ],

      outreach: [
        {
          id: generateId(),
          name: 'Clara Voss',
          type: 'contributor',
          status: 'confirmed',
          contactInfo: 'clara@claravoss.de · +49 176 555 001 02',
          fee: '€800 flat (2 articles)',
          articleId: ART.FEATURE,
          role: 'Staff Writer — Features & Behind the Scenes',
          notes: 'Feature + Making Of pieces. Deadline: 25 July. Copy to editorial by 1 Aug.',
          createdAt: '2026-05-01T09:00:00.000Z',
        },
        {
          id: generateId(),
          name: 'Studio Lumière',
          type: 'photographer',
          status: 'confirmed',
          contactInfo: 'book@studiolumiere.com · +33 6 98 76 54 32',
          fee: '€2,500 day rate',
          articleId: ART.INTERVIEW,
          role: 'Portrait Photographer — Interview shoot',
          notes: 'Interview portrait session for Sarah Chen piece. Date TBC — targeting late July.',
          createdAt: '2026-05-10T09:00:00.000Z',
        },
        {
          id: generateId(),
          name: 'Arc Fashion Group',
          type: 'advertiser',
          status: 'contacted',
          contactInfo: 'ads@arcfashion.com · +44 20 7946 0001',
          fee: '€4,000 / full page',
          articleId: ART.AD,
          role: 'Advertiser — Full Page (p.10)',
          notes: 'Invoice sent 1 June. Awaiting PO confirmation and hi-res artwork.',
          createdAt: '2026-06-01T09:00:00.000Z',
        },
        {
          id: generateId(),
          name: 'Nina Koch',
          type: 'stylist',
          status: 'prospecting',
          contactInfo: 'nina@ninakoch.studio',
          fee: 'TBC',
          articleId: ART.COLUMN,
          role: 'Columnist — Opinion',
          notes: 'Approached for column piece — "Tailoring as Truth". Awaiting response.',
          createdAt: '2026-05-15T09:00:00.000Z',
        },
      ],

      articleComments: [
        {
          id: generateId(), articleId: ART.FEATURE, kind: 'comment',
          authorId: 'user-sarah-chen', authorName: 'Sarah Chen',
          body: 'Strong open — the atelier-at-dawn image sets exactly the tone we want. Make sure the apprenticeship-economics section does not get cut; that is the part buyers will remember.',
          status: 'open', resolvedById: '', resolvedByName: '', resolvedAt: '',
          createdAt: '2026-06-02T11:00:00.000Z',
        },
        {
          id: generateId(), articleId: ART.FEATURE, kind: 'suggestion',
          authorId: 'user-marco-rossi', authorName: 'Marco Rossi',
          body: 'Suggest cutting "far from the noise of the show calendar" — it reads a touch editorial-cliché. The silence does the work on its own.',
          status: 'open', resolvedById: '', resolvedByName: '', resolvedAt: '',
          anchor: anchorIn(FEATURE_BODY, 'far from the noise of the show calendar'),
          createdAt: '2026-06-03T09:30:00.000Z',
        },
        {
          id: generateId(), articleId: ART.FEATURE, kind: 'comment',
          authorId: 'user-sarah-chen', authorName: 'Sarah Chen',
          body: 'Confirmed both ateliers for interview — Maison Lesage (Paris) and Atelier Hartmann (Berlin). Contacts in the shared doc.',
          status: 'approved', resolvedById: 'user-aileen', resolvedByName: 'Aileen',
          resolvedAt: '2026-06-04T14:00:00.000Z',
          createdAt: '2026-06-03T16:00:00.000Z',
        },
        {
          id: generateId(), articleId: ART.COLUMN, kind: 'suggestion',
          authorId: 'user-sarah-chen', authorName: 'Sarah Chen',
          body: 'Tighten the final paragraph — "a return to respect" is the line to end on. Drop the trailing clause after "demand".',
          status: 'approved', resolvedById: 'user-sarah-chen', resolvedByName: 'Sarah Chen',
          resolvedAt: '2026-06-05T10:00:00.000Z',
          createdAt: '2026-06-04T17:30:00.000Z',
        },
      ],

      articleVersions: [
        {
          id: generateId(), articleId: ART.FEATURE,
          label: 'v1 — first outline', wordCount: 180,
          authorId: '', authorName: 'Clara Voss',
          note: 'Opening + thesis only. Atelier section still bracketed.',
          body: 'There is a particular silence inside an atelier at eight in the morning. It is in this silence that the real work of fashion begins.\n\n[Thesis: craft and commerce are no longer opposing forces. Expand with two atelier case studies.]',
          createdAt: '2026-05-28T15:00:00.000Z',
        },
        {
          id: generateId(), articleId: ART.FEATURE,
          label: 'v2 — expanded open', wordCount: 320,
          authorId: '', authorName: 'Clara Voss',
          note: 'Fleshed out the dawn image and the two-decades framing.',
          body: 'There is a particular silence inside an atelier at eight in the morning — the hush before the first machine turns over, when the cutting tables are still bare and the light is flat and grey. It is in this silence that the real work of fashion begins, far from the noise of the show calendar.\n\nFor two decades the industry told itself that craft and commerce were opposing forces. This issue argues the opposite. [ateliers to confirm]',
          createdAt: '2026-06-01T12:00:00.000Z',
        },
      ],

      writerHours: [
        {
          id: generateId(), date: '2026-05-28', hours: 3.5,
          note: 'Outline + opening draft for The New Craft.',
          articleId: ART.FEATURE, writerId: TM.CV, billable: true,
          createdAt: '2026-05-28T18:00:00.000Z',
        },
        {
          id: generateId(), date: '2026-06-01', hours: 4,
          note: 'Expanded open; background reading on atelier apprenticeships.',
          articleId: ART.FEATURE, writerId: TM.CV, billable: true,
          createdAt: '2026-06-01T18:00:00.000Z',
        },
        {
          id: generateId(), date: '2026-06-02', hours: 1.5,
          note: 'First pass on the Making Of BTS piece.',
          articleId: ART.MAKING_OF, writerId: TM.CV, billable: true,
          createdAt: '2026-06-02T18:00:00.000Z',
        },
        {
          id: generateId(), date: '2026-06-03', hours: 0.5,
          note: 'Editorial call with Sarah re: feature direction.',
          articleId: ART.FEATURE, writerId: TM.CV, billable: false,
          createdAt: '2026-06-03T18:00:00.000Z',
        },
      ],

      totalBudget: 18000,
      budgetItems: [
        {
          id: generateId(),
          description: 'Portrait photography — Interview session',
          category: 'Photography',
          supplier: 'Studio Lumière',
          estimatedCost: 2500,
          actualCost: 0,
          status: 'pending',
          notes: 'Half-day rate. Date TBC.',
          invoiceFileName: '',
          invoiceFileId: '',
          createdAt: '2026-05-10T09:00:00.000Z',
        },
        {
          id: generateId(),
          description: 'Editorial design — all layouts',
          category: 'Editorial Design',
          supplier: 'Marco Rossi Creative',
          estimatedCost: 4500,
          actualCost: 0,
          status: 'pending',
          notes: 'Cover + 4 interior spreads + contents page.',
          invoiceFileName: '',
          invoiceFileId: '',
          createdAt: '2026-05-01T09:00:00.000Z',
        },
        {
          id: generateId(),
          description: 'Print production — 500 copies',
          category: 'Print Production',
          supplier: 'Artprint Studio',
          estimatedCost: 6000,
          actualCost: 0,
          status: 'pending',
          notes: '500 print run. Quote received. Files due 1 Sept.',
          invoiceFileName: '',
          invoiceFileId: '',
          createdAt: '2026-05-01T09:00:00.000Z',
        },
        {
          id: generateId(),
          description: 'Contributors — Clara Voss (2 pieces)',
          category: 'Contributors',
          supplier: 'Clara Voss',
          estimatedCost: 800,
          actualCost: 800,
          status: 'paid',
          notes: 'Deposit 50% paid on commissioning.',
          invoiceFileName: '',
          invoiceFileId: '',
          createdAt: '2026-05-01T09:00:00.000Z',
        },
        {
          id: generateId(),
          description: 'Distribution — press and trade',
          category: 'Distribution',
          supplier: 'Internal',
          estimatedCost: 3800,
          actualCost: 0,
          status: 'pending',
          notes: 'Press mailout + trade show allocation.',
          invoiceFileName: '',
          invoiceFileId: '',
          createdAt: '2026-05-15T09:00:00.000Z',
        },
        {
          id: generateId(),
          description: 'Contingency',
          category: 'Misc',
          supplier: '',
          estimatedCost: 400,
          actualCost: 0,
          status: 'pending',
          notes: '',
          invoiceFileName: '',
          invoiceFileId: '',
          createdAt: '2026-05-01T09:00:00.000Z',
        },
      ],
    },
  ]
}
