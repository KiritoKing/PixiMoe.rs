# ui-components Specification

## MODIFIED Requirements

### Requirement: Persistent Notification Center
The system SHALL provide a notification center to store and display all system notifications with full details.

#### Scenario: Notifications can be cleared
- **WHEN** user clicks "Clear All" button in notification center
- **THEN** confirmation dialog asks: "Clear all notifications?"
- **AND** upon confirmation, all notifications are deleted from storage
- **AND** notification center shows empty state: "No notifications"
- **WHEN** user clicks individual notification's delete button
- **THEN** specific notification is removed from list
- **NOTE**: Database clearing functionality has been moved to Settings Panel (see Database Management Settings requirement)

## ADDED Requirements

### Requirement: Database Management Settings
The system SHALL provide a database management page in the Settings Panel for viewing database statistics and clearing database data.

#### Scenario: Database settings page is accessible
- **WHEN** user opens Settings Panel
- **THEN** "Database" option is available in the settings navigation
- **AND** clicking "Database" opens the database management page
- **AND** page displays current database statistics (files, tags, folders, persons counts)

#### Scenario: Database statistics are displayed
- **WHEN** database settings page is open
- **THEN** statistics card shows:
  - Number of image files
  - Number of tags
  - Number of folders
  - Number of persons
  - Total record count
- **AND** statistics are fetched from backend via `get_database_stats()` command
- **AND** statistics update automatically when database changes

#### Scenario: Clear database operation is available
- **WHEN** database settings page is open
- **AND** database contains data (total records > 0)
- **THEN** "Clear Database" button is enabled in the "Dangerous Operations" section
- **WHEN** database is empty (total records = 0)
- **THEN** "Clear Database" button is disabled

#### Scenario: Clear database confirmation requires English text
- **WHEN** user clicks "Clear Database" button
- **THEN** confirmation dialog opens
- **AND** dialog displays warning about permanent data deletion
- **AND** dialog shows database statistics summary
- **AND** dialog requires user to input confirmation text: `CLEAR_ALL_DATA_PERMANENTLY`
- **WHEN** user enters correct confirmation text
- **THEN** "Confirm Clear Database" button becomes enabled
- **WHEN** user enters incorrect text
- **THEN** confirmation button remains disabled
- **WHEN** user confirms with correct text
- **THEN** database clearing operation starts
- **AND** progress is displayed during clearing
- **AND** completion message is shown when finished

