# Spec Delta

## Purpose
Provides a web interface to browse, inspect, create, update, and delete secrets stored in AWS Secrets Manager, with formatted viewing and clipboard integration.

## ADDED Requirements

### Requirement: List Secrets
The dashboard MUST list secrets available in AWS Secrets Manager for the configured region, displaying metadata for each secret in a tabular layout.

#### Scenario: Secrets table loaded successfully
- **WHEN** the user navigates to the Secrets Manager view
- **THEN** a table of secrets is displayed showing secret name, description, last changed date, and last accessed date
- **AND** the list reflects secrets retrieved from AWS Secrets Manager.

#### Scenario: Loading state display
- **WHEN** secrets metadata is being fetched from AWS Secrets Manager
- **THEN** table skeleton loaders are rendered in place of table rows.

#### Scenario: Secrets fetch error
- **WHEN** fetching the secrets list fails due to an AWS service or network error
- **THEN** an error message banner is displayed indicating the fetch failure
- **AND** the user is provided a retry action.

### Requirement: View Secret Value
The dashboard MUST allow users to reveal and inspect the secret value for a selected secret, with automatic detection and formatted rendering of JSON content.

#### Scenario: Reveal plaintext secret value
- **WHEN** the user triggers the reveal action for a secret containing plain text
- **THEN** the secret value is retrieved and displayed in cleartext within an inspection view.

#### Scenario: Reveal formatted JSON secret value
- **WHEN** the user triggers the reveal action for a secret containing valid JSON
- **THEN** the secret value is parsed and rendered with syntax indentation and structure.

#### Scenario: View value failure
- **WHEN** retrieving a secret value fails
- **THEN** an error alert is shown detailing that the secret value could not be loaded.

### Requirement: Copy Secret Value to Clipboard
The dashboard MUST allow users to copy the secret value to the system clipboard with instant visual confirmation.

#### Scenario: Copy value to clipboard
- **WHEN** the user clicks the copy button for a displayed secret value
- **THEN** the full secret value string is copied to the clipboard
- **AND** visual feedback confirming the copy operation is displayed briefly.

### Requirement: Create Secret
The dashboard MUST provide a creation dialog to define a new secret with a name, secret string value (plain text or JSON), and an optional description.

#### Scenario: Create new secret successfully
- **WHEN** the user opens the create secret dialog, fills in a unique name, secret value, optional description, and submits the form
- **THEN** the secret is created in AWS Secrets Manager
- **AND** the dialog closes
- **AND** the secrets table is refreshed to display the newly created secret.

#### Scenario: Create secret validation failure
- **WHEN** the user attempts to submit the create secret dialog with a missing or invalid name
- **THEN** the form highlights the validation errors
- **AND** submission to AWS Secrets Manager is prevented.

### Requirement: Edit Secret
The dashboard MUST provide an edit dialog pre-populated with the secret's existing metadata and value, allowing the user to update the secret string and description.

#### Scenario: Edit existing secret successfully
- **WHEN** the user initiates editing for a secret, modifies the value or description, and confirms the update
- **THEN** the secret is updated in AWS Secrets Manager via an update request
- **AND** the dialog closes
- **AND** the secrets table reflects the updated metadata.

#### Scenario: Edit secret update error
- **WHEN** updating the secret in AWS Secrets Manager fails
- **THEN** an error message is displayed within the dialog
- **AND** the dialog remains open with user edits intact.

### Requirement: Delete Secret with Confirmation
The dashboard MUST require explicit user confirmation before initiating the deletion of any secret from AWS Secrets Manager.

#### Scenario: Delete secret with confirmation
- **WHEN** the user triggers the delete action on a secret
- **THEN** a confirmation dialog is presented prompting the user to confirm deletion
- **AND** when the user confirms, the deletion request is submitted to AWS Secrets Manager
- **AND** the secret is removed from the secrets list upon completion.

#### Scenario: Cancel secret deletion
- **WHEN** the user cancels the confirmation dialog
- **THEN** no deletion request is sent
- **AND** the secret remains unchanged in the secrets table.
