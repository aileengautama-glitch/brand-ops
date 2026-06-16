/**
 * Canonical media.entity_type values.
 *
 * Single source of truth for the `entity_type` column on the media table.
 * Keeping these centralised prevents typos and drift as more image surfaces
 * are migrated to shared storage across Phase D batches.
 *
 * The MediaEntityType union uses the `(string & {})` trick so editors offer
 * autocomplete for the known values while the type still accepts any string —
 * future surfaces (D3 products/styling, D4 collaterals) can add their own
 * value here without breaking callers that pass it through generically.
 */

export const MEDIA_ENTITY = {
  // D1
  moodboardItem:       'moodboard_item',
  // D2 — event creative
  eventReference:      'event_reference',
  eventSketch:         'event_sketch',
  // D2 — shoot brief sections
  shootBriefWardrobe:  'shoot_brief_wardrobe',
  shootBriefHmu:       'shoot_brief_hmu',
  shootBriefLocation:  'shoot_brief_location',
  // D3 — products, styling, shots, models, D-Day timeline
  productImage:        'product_image',
  stylingImage:        'styling_image',
  shotReference:       'shot_reference',
  modelImage:          'model_image',
  ddayReference:       'dday_reference',
  // D4 — event collaterals
  collateralReference: 'collateral_reference',
  // Props (shared Events + Shoots)
  propImage:           'prop_image',
  // Magazine
  moodTile:            'mood_tile',
  graphicRef:          'graphic_ref',
  graphicPreview:      'graphic_preview',
  graphicsInspo:       'graphics_inspo',
} as const

type KnownMediaEntity = (typeof MEDIA_ENTITY)[keyof typeof MEDIA_ENTITY]

// Open union: autocomplete for known values, but any string is still valid.
export type MediaEntityType = KnownMediaEntity | (string & {})
