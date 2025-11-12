# Manual Testing Instructions for Capname Feature

Follow these steps to manually test the newly implemented capname feature.

## Setup

1.  **Start the MUD server:**
    Open your terminal in the project root directory (`C:\users\jonat\documents\vibemud`) and run:
    ```bash
    npm start
    ```

2.  **Connect to the MUD:**
    Open one or two separate terminal windows and connect to the MUD using telnet:
    ```bash
    telnet localhost 4000
    ```
    Login with an existing player or create a new one. If testing with two players, ensure both are logged in.

## Test Cases

### 1. Test `capname` command (initial state)

*   **Action:** Type `capname`
*   **Expected Output:** `You have not set a capname. Use `set capname <name>` to set one.`

### 2. Test `set capname` command (valid input)

*   **Action:** Type `set capname MyCoolName`
*   **Expected Output:** `Your capname has been set to: MyCoolName`
*   **Action:** Type `capname`
*   **Expected Output:** `Your current capname is: MyCoolName`

### 3. Test `set capname` command (update capname)

*   **Action:** Type `set capname AnotherName`
*   **Expected Output:** `Your capname has been set to: AnotherName`
*   **Action:** Type `capname`
*   **Expected Output:** `Your current capname is: AnotherName`

### 4. Test `set capname` command (invalid input - too short)

*   **Action:** Type `set capname sh`
*   **Expected Output:** `Capname must be between 3 and 20 characters long.`

### 5. Test `set capname` command (invalid input - too long)

*   **Action:** Type `set capname thisisareallylongcapnamethatshouldfail`
*   **Expected Output:** `Capname must be between 3 and 20 characters long.`

### 6. Test `look` command with capname

*   **Prerequisite:** Ensure two players are logged in and in the same room.
*   **Action (Player 2):** Type `set capname OtherPlayer`
*   **Action (Player 1):** Type `look`
*   **Expected Output (Player 1):** In the "Also here:" list, Player 2's capname (`OtherPlayer`) should be displayed instead of their original username.

### 7. Test `who` command with capname

*   **Prerequisite:** Ensure at least one player has set a capname.
*   **Action:** Type `who`
*   **Expected Output:** In the "Online Players" list, any player who has set a capname should display their capname in the "Username" column. Your own capname should also be displayed.

### 8. Test Persistence

*   **Prerequisite:** Ensure at least one player has set a capname.
*   **Action:** Log out all connected players by typing `quit`.
*   **Action:** Stop the MUD server (press `Ctrl+C` in the terminal where `npm start` is running).
*   **Action:** Restart the MUD server: `npm start`
*   **Action:** Connect via telnet and log back in with the player(s) who set a capname.
*   **Action:** Type `capname` for the player(s).
*   **Expected Output:** The previously set capname(s) should be displayed.
*   **Action:** Type `who` and `look` (if another player is present) to confirm capnames are still displayed correctly after a server restart.

Once all these tests pass, the capname feature is successfully implemented and verified.