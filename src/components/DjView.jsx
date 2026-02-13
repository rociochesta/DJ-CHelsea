import React from "react";
import HostView from "./HostView";

/**
 * Backwards-compatible wrapper.
 * We’re consolidating DJView + HostView into HostView to avoid duplicated logic/UI.
 */
export default function DJView(props) {
  return <HostView {...props} />;
}