# Spec Delta

## Purpose
Provides an interactive time-series metrics visualization interface for monitoring CPU and memory utilization trends across ECS services over configurable preset or custom time windows.

## ADDED Requirements

### Requirement: Cluster Selection Dropdown
The system MUST provide a cluster selection dropdown containing the four supported ECS clusters (`kairos-pay-cluster-ecs-iac`, `kairos-his-cluster-ecs-iac`, `kairos-pas-cluster-ecs-iac`, and `kairos-fe-cluster-ecs-iac`). Switching clusters MUST reset the currently selected service and initiate fetching the list of services for the newly selected cluster.

#### Scenario: Cluster selection updates active cluster
- **WHEN** a user selects a cluster from the cluster dropdown
- **THEN** the selected cluster is displayed as the active selection
- **THEN** any previously selected service is cleared
- **THEN** service retrieval is triggered for the chosen cluster

#### Scenario: Default cluster selection on initial load
- **WHEN** the metrics explorer page loads without pre-existing query parameters
- **THEN** the primary payment cluster (`kairos-pay-cluster-ecs-iac`) is selected by default
- **THEN** the service list for the default cluster is automatically fetched

---

### Requirement: Service Selection
The system MUST provide a service selection dropdown populated with the services retrieved for the currently active cluster. The dropdown MUST display service names and their current operational status. The service selector MUST be disabled while services are loading. Selecting a service MUST enable metric queries for that service.

#### Scenario: Services loaded for selected cluster
- **WHEN** services for the active cluster are retrieved successfully
- **THEN** the service selection dropdown is enabled and lists all available services in that cluster
- **THEN** each option indicates the service name

#### Scenario: Service selection by user
- **WHEN** a user selects a specific service from the dropdown
- **THEN** the chosen service becomes the active service target for metric exploration
- **THEN** metrics exploration actions become enabled

#### Scenario: Service list fetch failure
- **WHEN** fetching services for the active cluster fails
- **THEN** the service dropdown remains empty and an error message is displayed
- **THEN** a retry action is made available to re-fetch the cluster's services

---

### Requirement: Time Range Selection
The system MUST support selecting time ranges via either preset duration buttons/options or a custom datetime range selector. Supported preset intervals MUST include 15 minutes, 1 hour, 3 hours, 6 hours, 12 hours, 24 hours, 3 days, and 7 days. Switching between preset and custom range modes MUST preserve input state.

#### Scenario: Preset time range selection
- **WHEN** a user chooses a preset duration (such as "1h" or "24h")
- **THEN** the start time is dynamically calculated relative to the current time based on the chosen duration
- **THEN** the preset option is visually marked as active

#### Scenario: Custom time range input
- **WHEN** a user toggles to custom time range mode and specifies both start and end datetime values
- **THEN** the custom range is set as the active query window
- **THEN** the preset selector buttons are deselected

#### Scenario: Custom range missing start or end datetime
- **WHEN** custom time range mode is active and the user attempts to query metrics without providing both start and end datetimes
- **THEN** the system prevents submission and displays a validation alert requiring both start and end times

---

### Requirement: Time Range Validation
The system MUST validate the requested time window before and during metric retrieval. The server MUST reject any query window exceeding 7 days, any query where the end datetime precedes the start datetime, or any query where the start datetime is in the future.

#### Scenario: Time range validation error for duration exceeding 7 days
- **WHEN** a user specifies a custom time range spanning more than 7 consecutive days (168 hours)
- **THEN** the server rejects the request with a validation error
- **THEN** the system displays an error message informing the user that time ranges cannot exceed 7 days

#### Scenario: Custom range with end time earlier than start time
- **WHEN** a user enters an end datetime that is chronologically earlier than or equal to the start datetime
- **THEN** the system rejects the range with an error message indicating start time must precede end time

---

### Requirement: Metric Type Toggle
The system MUST allow users to toggle the visible metric series between CPU utilization only, Memory utilization only, or Both metrics simultaneously. Toggling the metric type MUST update chart series visibility immediately without requiring a full refetch if data for both metrics is already loaded.

#### Scenario: Metric type selection
- **WHEN** a user toggles the metric filter to "CPU", "Memory", or "Both"
- **THEN** the chart presentation and legend update to display only the selected metric series
- **THEN** the active toggle option receives visual active state styling

---

### Requirement: Time-Series Metric Data Fetching
The system MUST fetch time-series metrics by sending a request to the metrics-range API with the selected cluster, service, start timestamp, end timestamp, and metric type parameters.

#### Scenario: Fetch metrics for selected service and time range
- **WHEN** a user triggers a metrics query for an active cluster and service with a valid time range
- **THEN** the system issues a POST request to the metrics-range endpoint with the cluster name, service name, ISO timestamps for start and end, and requested metric type
- **THEN** a loading state is presented while data is being retrieved

#### Scenario: Metrics fetch rate limited
- **WHEN** the metrics API returns a rate-limiting response (HTTP 429)
- **THEN** the system displays a rate limit notification indicating when the user can retry

#### Scenario: Metrics query without selected service
- **WHEN** a user attempts to fetch metrics without selecting a service
- **THEN** the system prevents the request and highlights the service selection requirement

---

### Requirement: Time-Series Line Chart Display
The system MUST render time-series utilization data as an interactive line chart. The chart MUST display timestamp labels along the horizontal X-axis, percentage utilization (0–100%) along the vertical Y-axis, distinct line colors for CPU and Memory, an interactive legend, and hover tooltips showing precise timestamps and metric percentage values.

#### Scenario: Chart rendering with both metrics
- **WHEN** metric data for both CPU and Memory is successfully retrieved
- **THEN** the chart renders two distinct continuous lines (one for CPU utilization and one for Memory utilization)
- **THEN** both series are labeled in the chart legend
- **THEN** the Y-axis is formatted with percentage indicators (0% to 100%)
- **THEN** the X-axis displays human-readable localized time stamps

#### Scenario: Interactive tooltip on data point hover
- **WHEN** a user hovers over any point or region on the chart
- **THEN** a tooltip appears displaying the exact date, time, and the corresponding CPU and/or Memory percentage values at that timestamp

#### Scenario: Empty metrics data response
- **WHEN** the metrics query succeeds but contains no data points within the selected time range
- **THEN** an empty state indicator is rendered in the chart container informing the user that no metric data was recorded for the period

---

### Requirement: Loading and Error States
The system MUST render clear visual indicators for all asynchronous states: loading skeletons/spinners while fetching services or metric series, contextual error alerts on request failures, and non-blocking notifications for transient issues.

#### Scenario: Loading state during metric retrieval
- **WHEN** a metric query is in flight
- **THEN** a loading indicator or skeleton overlay is displayed over the chart area and query controls are disabled

#### Scenario: API error handling with retry
- **WHEN** a metric query fails due to network or server errors
- **THEN** an error alert is displayed describing the failure reason
- **THEN** a retry button is provided to re-execute the query with the current parameters
