# Spec Delta

## Purpose
Enables users to generate and download portable Linux shell scripts (`.sh`) configured for interactive AWS ECS Exec terminal access to running containers with diagnostic pre-flight checks and fallback shells.

## ADDED Requirements

### Requirement: Generate Linux Shell Connect Script
The system MUST generate a POSIX-compatible Linux shell script (`.sh`) parameterized for a selected service, cluster, and AWS region (`ap-southeast-3`) to connect to an interactive container session using AWS ECS Exec.

#### Scenario: Script generation with pre-flight checks and execution commands
- **WHEN** the user requests a connection script for a specified ECS service and cluster
- **THEN** a shell script is generated containing:
  - Configuration variables for cluster name, service name, and region (`ap-southeast-3`)
  - Pre-flight validation verifying that the AWS CLI is installed and available in `PATH`
  - Pre-flight validation verifying that active AWS credentials are configured
  - Pre-flight check verifying ECS Exec capability is enabled for the target service
  - Commands to discover the primary running task ARN and container name for the service
  - An interactive command executing `aws ecs execute-command` targeting the container.

### Requirement: Shell Binary Fallback
The generated script MUST attempt to execute an interactive session using `/bin/bash` first, falling back to `/bin/sh` if `/bin/bash` is unavailable within the container image.

#### Scenario: Shell fallback execution logic
- **WHEN** the script initiates an interactive session inside the container
- **THEN** it attempts to launch `/bin/bash`
- **AND** if `/bin/bash` execution exits or is unavailable, it invokes `/bin/sh` as a secondary fallback.

### Requirement: Script Download
The dashboard MUST provide a mechanism for the user to download the generated shell script as an executable file (`.sh`) directly from the browser.

#### Scenario: Download connection script
- **WHEN** the user triggers the download action for a service's connection script
- **THEN** the browser downloads a `.sh` file named after the cluster and service
- **AND** the file content contains the complete generated Linux shell script.
