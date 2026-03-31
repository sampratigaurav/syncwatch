/**
 * Page script entry — MAIN world, document_start.
 *
 * Runs before YouTube's own JS.  Initialises the YouTube adapter which
 * waits for the player element and then starts syncing.
 */
import { initYouTubeAdapter } from './youtubeAdapter'

initYouTubeAdapter()
