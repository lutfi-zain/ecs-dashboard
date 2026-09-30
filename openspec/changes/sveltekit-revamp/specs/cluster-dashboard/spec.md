# Spec Delta

## Purpose
Provides an operational dashboard for monitoring ECS clusters, inspecting service health and configuration, triggering forced deployments across selected services, and querying on-demand resource utilization.

## ADDED Requirements

### Requirement: Cluster Overview Display
The system MUST display high-level health and capacity metrics across all managed ECS clusters as overview cards. Each card MUST display the cluster name, cluster operational status, total active services count, running tasks count, and pending tasks count.

#### Scenario: Display cluster overview cards on initial render
- **WHEN** the dashboard page loads
- **THEN** an overview card is displayed for each managed cluster showing its name, operational status, count of active services, count of running tasks, and count of pending tasks

#### Scenario: Visual status indication on cluster card
- **WHEN** a cluster has an active and healthy status
- **THEN** the cluster status badge indicates active health using standard semantic status styling
- **WHEN** a cluster has pending tasks or non-active status
- **THEN** the cluster status badge indicates warning or degraded health accordingly

### Requirement: Cluster Selection and Filtering Scope
The system MUST allow users to select an active cluster to scope the service table and operational actions. Selection MUST be possible via clicking a cluster overview card or using a cluster dropdown selector. The currently active cluster MUST be visually highlighted, and selecting a new cluster MUST update the service table to display only services belonging to that cluster.

#### Scenario: Select cluster via overview card click
- **WHEN** a user clicks on an unselected cluster overview card
- **THEN** that cluster becomes the active selected cluster, receives active visual highlighting, and the service table refreshes to show services belonging to that cluster

#### Scenario: Select cluster via dropdown selector
- **WHEN** a user chooses a cluster from the cluster selector dropdown
- **THEN** the active cluster updates to the chosen cluster, the corresponding overview card receives active visual highlighting, and the service table updates to display that cluster's services

### Requirement: Service Table Presentation
The system MUST render services for the selected cluster in a tabular view with columns: selection checkbox, service name, status badge, tasks summary (running / desired / pending), CPU utilization %, memory utilization %, task definition revision, last deployment timestamp, created timestamp, and action menu.

#### Scenario: Service table rendering for active cluster
- **WHEN** a cluster with registered services is selected
- **THEN** the service table renders rows for each service displaying service name, current status, task counts in running/desired/pending format, task definition family and revision, last deployment date, and creation date

#### Scenario: Service table empty state
- **WHEN** a selected cluster contains no registered services
- **THEN** the service table displays a clear empty state message indicating no services exist in the cluster

### Requirement: Service Selection
The system MUST support multi-service selection for batch operations. Users MUST be able to select or deselect individual services via row checkboxes, toggle all visible services via a header master checkbox, and observe the count of currently selected services.

#### Scenario: Toggle individual service selection
- **WHEN** a user clicks an unselected service row checkbox
- **THEN** that service row is marked as selected, visually highlighted, and the selected services count increments by one

#### Scenario: Select all visible services toggle
- **WHEN** a user checks the table header master checkbox
- **THEN** all currently visible services in the table become selected, and the selection counter reflects the count of visible services

#### Scenario: Clear selection across filtered rows
- **WHEN** services are selected and the master checkbox is toggled off
- **THEN** all selected services are deselected, and batch action buttons become disabled

### Requirement: Service Status Filtering
The system MUST allow filtering the service table by service operational status, including running/active, pending, and degraded/inactive states.

#### Scenario: Filter services by status
- **WHEN** a user selects a status filter option (such as "Running" or "Pending")
- **THEN** the service table immediately updates to display only services matching the selected status
- **THEN** the selection count and master checkbox state adapt to the filtered subset of services

#### Scenario: Reset status filter
- **WHEN** a user clears or resets the status filter to all
- **THEN** all services belonging to the active cluster are displayed in the service table

### Requirement: Forced Service Deployment
The system MUST allow users to trigger a forced deployment across one or more selected services. The system MUST require confirmation before execution, display real-time progress for each selected service during deployment, and report individual success or failure outcomes once completed.

#### Scenario: Force deployment execution with success
- **WHEN** a user selects one or more services, clicks the force deployment action, and confirms the prompt
- **THEN** the system triggers a force new deployment for each selected service sequentially or in batch
- **THEN** each selected service indicates in-progress deployment status
- **THEN** upon completion, each service displays a success notification and the table reflects the initiated deployment

#### Scenario: Force deployment partial failure
- **WHEN** a force deployment request fails for one or more services in a batch
- **THEN** the system displays error details for the failing services while preserving success status for completed services
- **THEN** the user is presented with an option to retry failed deployments

### Requirement: On-Demand Service Resource Metrics
The system MUST provide on-demand retrieval of current CPU and memory utilization percentages for services in the active cluster. Resource percentages MUST be color-coded using standard thresholds: green/healthy for utilization below 60%, amber/warning for utilization between 60% and 80%, and red/critical for utilization exceeding 80%.

#### Scenario: Load service metrics on demand
- **WHEN** a user triggers the metrics loading action for the current cluster
- **THEN** the system fetches the latest CPU and memory utilization figures for services in the cluster
- **THEN** the CPU % and RAM % table columns populate with percentage values

#### Scenario: Color-coded resource thresholds
- **WHEN** a service's CPU or memory utilization is below 60%
- **THEN** the utilization value is displayed with emerald/green styling
- **WHEN** a service's CPU or memory utilization is between 60% and 80%
- **THEN** the utilization value is displayed with amber/warning styling
- **WHEN** a service's CPU or memory utilization exceeds 80%
- **THEN** the utilization value is displayed with red/critical styling

### Requirement: Server-Side Initial Render and Client-Side Revalidation
The system MUST fetch initial cluster overview and service data server-side during the initial page request to provide fast first contentful paint without client-side loading spinners. Subsequent navigations and manual refreshes MUST execute client-side without full page reloads.

#### Scenario: SSR initial page load
- **WHEN** a user navigates to the cluster dashboard URL directly
- **THEN** the server renders the complete cluster overview cards and default selected cluster service table in the initial HTML response
- **THEN** the dashboard is fully interactive without displaying an initial full-page loading placeholder

#### Scenario: Client-side data refresh
- **WHEN** a user triggers a data refresh while viewing the dashboard
- **THEN** the dashboard fetches updated cluster and service state asynchronously on the client
- **THEN** the table and overview cards update in place with refreshed data without navigating away or causing full page re-render

### Requirement: Manual Refresh with Exponential Backoff
The system MUST provide a manual refresh trigger allowing users to fetch the latest cluster and service states. If data fetching encounters network errors or API throttling, the system MUST automatically retry with exponential backoff before presenting an error state.

#### Scenario: Manual refresh with transient failure and successful retry
- **WHEN** a user clicks the manual refresh button and the first attempt encounters a transient error or rate limit
- **THEN** the system automatically retries the request with exponential backoff delay
- **THEN** upon a successful subsequent attempt, the dashboard updates with latest cluster data and dismisses transient error indicators

#### Scenario: Manual refresh persistent failure
- **WHEN** all retry attempts with exponential backoff are exhausted without success
- **THEN** the system preserves the existing rendered cluster data, displays a non-blocking error banner explaining the failure, and provides a manual retry action
