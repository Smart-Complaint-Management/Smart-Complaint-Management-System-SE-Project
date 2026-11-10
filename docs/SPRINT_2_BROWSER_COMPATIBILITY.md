# Sprint 2 - Browser Compatibility Test Plan

## 1. Objective

The objective of this test plan is to verify that the Smart Complaint
Management System (SCMS) works correctly across commonly used web
browsers. The layout, navigation, complaint registration, priority
classification, duplicate detection, search, and filtering features
should behave consistently.

## 2. Browsers to Be Tested

| Browser | Testing Purpose |
|---------|-----------------|
| Google Chrome | Primary browser compatibility |
| Microsoft Edge | Chromium-based browser compatibility |
| Mozilla Firefox | Cross-engine compatibility |
| Safari | WebKit browser compatibility |

## 3. Features to Be Tested

### 3.1 Authentication
- Verify that the login page loads correctly.
- Verify that users can enter their credentials.
- Verify that successful login redirects to the correct dashboard.
- Verify that logout works correctly.

### 3.2 Complaint Registration
- Verify that the complaint registration form is displayed correctly.
- Verify that users can enter complaint details.
- Verify that form validation works.
- Verify that a complaint can be submitted successfully.

### 3.3 Priority Classification
- Verify that complaints receive an automatically assigned priority.
- Verify that priority labels are displayed correctly.
- Verify that administrators can override complaint priority.

### 3.4 Duplicate Detection
- Verify that similar complaints are identified.
- Verify that possible duplicate information is displayed.
- Verify that administrators can review duplicate complaints.
- Verify that reviewing a duplicate does not merge or delete complaints.

### 3.5 Search and Filtering
- Verify that administrators can search using complaint IDs and keywords.
- Verify that category, status, and priority filters work.
- Verify that multiple filters can be applied together.
- Verify that search results update correctly.

### 3.6 User Interface
- Verify that pages are displayed without overlapping elements.
- Verify that buttons, dropdowns, and navigation links work.
- Verify that tables and forms remain readable.
- Verify that the interface works at different screen sizes.

## 4. Test Execution Matrix

| Test ID | Test Scenario | Expected Result |
|---------|---------------|-----------------|
| BC-01 | Open login page | Page loads correctly |
| BC-02 | Log in with valid credentials | Correct dashboard is displayed |
| BC-03 | Register a complaint | Complaint is submitted successfully |
| BC-04 | Check automatic priority | Correct priority label is displayed |
| BC-05 | Override complaint priority | Updated priority is displayed |
| BC-06 | Register a similar complaint | Possible duplicate is identified |
| BC-07 | Review a duplicate complaint | Review status is updated |
| BC-08 | Search using complaint ID | Matching complaint is displayed |
| BC-09 | Filter by priority | Only matching complaints are displayed |
| BC-10 | Apply multiple filters | Results match all selected filters |
| BC-11 | Resize browser window | Interface remains usable |
| BC-12 | Navigate between pages | Navigation works correctly |

## 5. Testing Procedure

1. Open the SCMS application in each supported browser.
2. Log in using the appropriate test account.
3. Execute the test scenarios listed in the test matrix.
4. Observe the interface and feature behaviour.
5. Record any layout issues, errors, or inconsistent behaviour.
6. Repeat failed test cases after fixes are applied.

## 6. Result Recording

Each test case should be marked as one of the following:

- PASS: The feature works as expected.
- FAIL: The feature does not work as expected.
- NOT TESTED: The test has not yet been executed.

Actual results should be recorded after testing in each browser.

## 7. Conclusion

Browser compatibility testing helps ensure that the Smart Complaint
Management System provides a consistent and reliable experience
across commonly used browsers. All identified issues should be
documented and resolved before the final system demonstration.
