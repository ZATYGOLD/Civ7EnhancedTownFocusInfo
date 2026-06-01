// File Path: ui/etfi-details/etfi-view-state.js
//
// Author: Zatygold
//
// Tiny shared UI state: whether the Town Focus cards' inline details are hidden
// (toggled by the panel's header checkbox). Lives in its own module so both the
// panel section (which writes it) and the focus hover tooltip (which reads it to
// switch into its two-column layout) can share it without a circular import.

let hideDetails = false;

export function getHideDetails() {
  return hideDetails;
}

export function setHideDetails(value) {
  hideDetails = !!value;
}
