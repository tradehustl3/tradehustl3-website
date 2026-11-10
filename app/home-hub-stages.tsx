import { HUB_ORGANIZATION_LINK, HUB_STAGES } from "./home-hub-stages-data";
import { HubStagePicker } from "./home-hub-stage-picker";

/**
 * Server wrapper: the stage data reads the trade catalog for its counts, so it
 * is resolved here and handed to the client picker as plain props. That keeps
 * the catalog out of the browser bundle.
 */
export function HubStages() {
  return <HubStagePicker stages={HUB_STAGES} organization={HUB_ORGANIZATION_LINK} />;
}
