# Spec

## Purpose
Provides the application shell layout, collapsible sidebar navigation, page routing, global header with AWS health status monitoring, and dark/light mode toggle.

## Requirements

### Requirement: Layout Shell and Viewport Responsiveness
The application MUST provide a unified shell layout containing a sidebar navigation area and a primary main content area. On desktop viewports, the sidebar MUST be visible alongside the content area. On compact/small viewports (e.g. mobile or tablet screens), the sidebar MUST collapse automatically into a drawer or hidden panel accessible via a toggle trigger to maximize workspace area.

#### Scenario: Desktop layout presentation
- **WHEN** a user visits the application on a desktop viewport
- **THEN** the sidebar and the main content area are displayed side-by-side without overlapping.

#### Scenario: Small screen responsive collapse
- **WHEN** the application is rendered on a viewport narrower than the desktop breakpoint
- **THEN** the sidebar collapses out of view and a toggle trigger is presented to open or reveal navigation.

### Requirement: Collapsible Sidebar Navigation
The sidebar navigation MUST display navigation links for the primary application sections: "Dashboard", "Metrics", and "Secrets". The sidebar MUST support manual collapsing and expanding between a full view (showing navigation icons and text labels) and a collapsed view (showing icon-only or minimal footprint). The collapse state MUST persist across page navigation within the session.

#### Scenario: Toggling sidebar collapse state
- **WHEN** a user triggers the sidebar collapse control
- **THEN** the sidebar transitions between expanded and collapsed states while maintaining navigation link availability.

#### Scenario: Navigating between sections via sidebar
- **WHEN** a user clicks on the "Metrics" navigation item in the sidebar
- **THEN** the application navigates to `/metrics` and renders the metrics view in the content area.

### Requirement: Active Route Indication
The sidebar navigation MUST visually indicate the currently active route matching the current browser path. The active item MUST be distinguished visually from inactive items through contrast, typography weight, or accent styling.

#### Scenario: Active route indication for root path
- **WHEN** the user navigates to `/`
- **THEN** the "Dashboard" navigation item is visually highlighted as active while "Metrics" and "Secrets" remain inactive.

#### Scenario: Active route updates on navigation
- **WHEN** the user navigates from `/` to `/secrets`
- **THEN** the "Dashboard" navigation item transitions to inactive and the "Secrets" navigation item transitions to active.

### Requirement: Global Header and Metadata
The application shell header MUST display the current page title, the timestamp of the most recent data fetch, a manual refresh control, and an AWS connectivity health indicator badge with an on-demand health check action.

#### Scenario: Page title display
- **WHEN** a user is on `/metrics`
- **THEN** the header displays the page title for the Metrics section.

#### Scenario: Last updated timestamp display
- **WHEN** page data is loaded or refreshed
- **THEN** the header displays the timestamp corresponding to when the data was retrieved.

### Requirement: AWS Health Status and Verification
The header MUST present an AWS health badge indicating current connectivity and authorization status against AWS services (healthy, degraded, or unhealthy). Users MUST be able to trigger an on-demand health check from the header.

#### Scenario: Header health status display
- **WHEN** the application verifies AWS credentials and service reachability successfully
- **THEN** the header displays a healthy status indicator badge.

#### Scenario: Triggering on-demand health check
- **WHEN** the user clicks the health check action in the header
- **THEN** the application re-verifies AWS service status and updates the health status indicator badge and timestamp accordingly.

### Requirement: Dark and Light Mode Toggle
The application shell MUST provide a dark and light theme toggle accessible from the sidebar. Switching themes MUST immediately apply the chosen color scheme across the application without requiring a page reload.

#### Scenario: Toggling between themes
- **WHEN** a user in light mode clicks the theme toggle control
- **THEN** the application switches to dark mode, updating visual styles across the shell and content areas.
