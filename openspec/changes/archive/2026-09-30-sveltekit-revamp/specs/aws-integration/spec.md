# Spec Delta

## Purpose
Provides a resilient server-side integration layer for AWS services, managing credential resolution, API client configuration, rate limiting, retry backoff with jitter, cluster whitelisting, and connectivity health monitoring.

## ADDED Requirements

### Requirement: AWS Credential Resolution
The system MUST resolve AWS credentials following the standard AWS credential provider hierarchy: environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`), followed by AWS configuration/credentials files (`~/.aws/credentials`), followed by IAM roles / ECS container credentials, and finally EC2 instance metadata profiles.

#### Scenario: Resolve credentials from environment variables
- **WHEN** valid AWS credentials are provided via environment variables
- **THEN** the system uses the environment credentials for all AWS API calls and reports the credential source as environment variables in health checks

#### Scenario: Fallback to local AWS profile
- **WHEN** no AWS environment variables are set and local AWS credentials exist in `~/.aws/credentials`
- **THEN** the system resolves credentials from the default local AWS profile and successfully executes AWS API calls

#### Scenario: Fallback to IAM or container credentials
- **WHEN** no environment variables or local credentials files are present in an execution environment with IAM role or container credential providers
- **THEN** the system automatically resolves credentials from the container or instance role metadata

#### Scenario: Missing credentials failure
- **WHEN** no valid credentials can be discovered across any provider in the resolution chain
- **THEN** AWS API operations fail with an explicit authentication error, and health status is marked as unhealthy

---

### Requirement: Region Configuration
The system MUST default to the `ap-southeast-3` AWS region unless explicitly overridden by the `AWS_REGION` or `AWS_DEFAULT_REGION` environment variables.

#### Scenario: Default region fallback
- **WHEN** neither `AWS_REGION` nor `AWS_DEFAULT_REGION` is defined in the environment
- **THEN** all AWS API requests target `ap-southeast-3`

#### Scenario: Custom region override
- **WHEN** `AWS_REGION` is set to a specific valid region identifier
- **THEN** all AWS API requests use the configured region identifier

---

### Requirement: Cluster Whitelist Enforcement
The system MUST restrict ECS cluster queries and operations to a pre-configured whitelist of allowable cluster names. Requests specifying unlisted clusters MUST be rejected before initiating AWS API operations.

#### Scenario: Whitelisted cluster access permitted
- **WHEN** a client requests data or operations for a cluster name present in the whitelist
- **THEN** the request proceeds to query the AWS ECS API

#### Scenario: Non-whitelisted cluster access rejected
- **WHEN** a client requests data or operations for a cluster name not present in the whitelist
- **THEN** the request is rejected immediately with a validation error, and no AWS API calls are made

---

### Requirement: ECS Service Operations
The system MUST provide capabilities to describe clusters, list cluster services, describe service details, retrieve active task definitions, and trigger service updates (including forced new deployments) via ECS API operations.

#### Scenario: Retrieve cluster details and services
- **WHEN** a valid cluster name is queried
- **THEN** the system invokes `DescribeClusters`, `ListServices`, and `DescribeServices` to return service state, desired counts, running counts, task definition ARNs, and deployment status

#### Scenario: Retrieve service task definition details
- **WHEN** task definition details are requested for a registered service
- **THEN** the system queries `DescribeTaskDefinition` and returns container names, image tags, environment variables, and resource allocations

#### Scenario: Trigger service force update
- **WHEN** a force update action is requested for an existing whitelisted cluster and service
- **THEN** the system invokes `UpdateService` with `forceNewDeployment: true` and returns the updated deployment status

---

### Requirement: CloudWatch Metric Collection
The system MUST query CloudWatch metric data using `GetMetricData` for `CPUUtilization` and `MemoryUtilization` dimensions under the `AWS/ECS` namespace across specified time ranges and intervals.

#### Scenario: Query service CPU and Memory utilization
- **WHEN** metrics are requested for a valid cluster and service over a specified time window
- **THEN** the system queries CloudWatch for both `CPUUtilization` and `MemoryUtilization` metric series and returns timestamped datapoints sorted chronologically

#### Scenario: Empty metric datapoints handled gracefully
- **WHEN** CloudWatch returns no datapoints for the requested metric window
- **THEN** the system returns empty series lists without error

---

### Requirement: Secrets Manager Management Operations
The system MUST provide capabilities to list secrets, retrieve secret values, create new secrets, update existing secret values, and schedule secret deletion.

#### Scenario: List and retrieve secret contents
- **WHEN** secrets are listed or a specific secret value is requested by name or ARN
- **THEN** the system queries `ListSecrets` or `GetSecretValue` respectively and returns the secret metadata and secret string payload

#### Scenario: Create or update secret
- **WHEN** a valid secret creation or update request is submitted
- **THEN** the system invokes `CreateSecret` or `UpdateSecret` and returns the resulting secret ARN and version ID

#### Scenario: Delete secret
- **WHEN** a deletion request is issued for an existing secret
- **THEN** the system invokes `DeleteSecret` with appropriate recovery window configuration and confirms the deletion schedule

---

### Requirement: Rate Limiting
To prevent hitting AWS account-level and service-level API rate limits, the system MUST enforce concurrency throttling: a maximum of 3 concurrent in-flight AWS API calls and a mandatory minimum delay of 200 milliseconds between consecutive outbound API calls.

#### Scenario: Concurrency limit enforcement
- **WHEN** more than 3 AWS API requests are initiated concurrently
- **THEN** requests exceeding the concurrency limit of 3 are queued and executed only as earlier requests complete

#### Scenario: Minimum inter-call delay enforcement
- **WHEN** consecutive AWS API requests are dispatched in rapid succession
- **THEN** the system enforces a minimum interval of 200 milliseconds between the start of each outbound request

---

### Requirement: Retry with Exponential Backoff and Jitter
The system MUST automatically retry transient AWS failures and network errors up to 3 times, using exponential backoff starting from a 1000ms base delay that doubles on each successive attempt, combined with randomized jitter.

#### Scenario: Transient network failure resolved by retry
- **WHEN** an AWS API call fails with a transient network error or 5xx server error
- **THEN** the system retries the call up to 3 times with exponentially increasing delay (base 1000ms, doubling per attempt plus jitter) before succeeding

#### Scenario: Maximum retry exhaustion
- **WHEN** an AWS API call consistently fails through all 3 retry attempts
- **THEN** the system aborts further retries and surfaces the underlying error to the caller

---

### Requirement: Throttling Exception Handling
The system MUST detect AWS throttling exceptions (such as `ThrottlingException`, `ProvisionedThroughputExceededException`, or HTTP 429 status codes) and automatically retry the affected request using exponential backoff.

#### Scenario: Throttling error handled with backoff retry
- **WHEN** an AWS API call returns a `ThrottlingException`
- **THEN** the system recognizes the throttle condition, applies exponential backoff with jitter, and retries the request without failing the caller immediately

---

### Requirement: Request Timeout
All client-side API requests targeting the server-side AWS integration endpoints MUST enforce a 30-second request timeout via `AbortSignal`.

#### Scenario: Request completes within timeout
- **WHEN** an AWS integration endpoint responds within 30 seconds
- **THEN** the response is parsed and processed successfully

#### Scenario: Request exceeds 30-second timeout
- **WHEN** an upstream AWS call or endpoint execution exceeds 30 seconds
- **THEN** the request is aborted via the `AbortSignal`, and a timeout error is raised to the client

---

### Requirement: AWS Health Check
The system MUST expose a health check capability that verifies active AWS connectivity by attempting a lightweight ECS read operation, returning overall status (`healthy` or `unhealthy`), diagnostic message, active region, and resolved credential source.

#### Scenario: Health check success
- **WHEN** the health check is executed and AWS credentials and connectivity are functional
- **THEN** the system returns a status of `healthy`, confirms the active region, identifies the credential source, and includes a confirmation message

#### Scenario: Health check failure
- **WHEN** the health check encounters invalid credentials, network unavailability, or AWS service failure
- **THEN** the system returns a status of `unhealthy`, an error message describing the failure, the attempted region, and an error indication for the credential source
