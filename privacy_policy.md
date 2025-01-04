# Privacy Policy for Chromini - Browse with Gemini

## Overview
Chromini is a Chrome extension that helps users understand web content by connecting directly with Google's Gemini AI. We take your privacy seriously and handle all data with utmost care.

## Required Permissions Explained

### Core Permissions
- **`activeTab`**: Allows reading content from your active tab when you use the extension
- **`scripting`**: Required to extract readable content from webpages
- **`storage`**: Stores only your API key locally in Chrome
- **`tabs`**: Needed to detect tab changes for automatic summarization
- **`tabCapture`**: Required specifically for Google Docs and similar protected content
- **`sidePanel`**: Enables the persistent chat interface

### Host Permissions (`https://*/*`, `http://*/*`)
- **Why Needed**: Required for automatic page summarization and content analysis
- **When Used**: Only when you're actively viewing a webpage
- **What's Accessed**: Only the visible content of your current webpage
- **Limitation**: We never access or analyze pages in other tabs

## Data Collection and Usage

### What We Access
- **Webpage Content**: Text from pages you're actively viewing
- **User Queries**: Questions you ask about the current page
- **API Key**: Your personal Gemini API key (stored locally)

### How We Use It
- Generate immediate summaries of pages you visit
- Answer questions about the current page's content
- Authenticate your requests to the Gemini API

### What We Don't Do
- Don't store webpage content anywhere
- Don't track browsing history
- Don't collect personal information
- Don't share or sell any data
- Don't log conversations or queries
- Don't analyze pages in background tabs
- Don't send data to any servers except Gemini API

## Data Flow
1. When you load a webpage:
   - Content script extracts visible text
   - Sends to Gemini API for summarization
   - Shows results in sidebar
   - Immediately discards page content

2. When you ask a question:
   - Combines your question with current page context
   - Sends to Gemini API for answering
   - Shows response in sidebar
   - Clears conversation when you change pages

## Data Storage
- API key: Stored locally in Chrome's secure storage
- Chat history: Temporary, only during current page visit
- Page content: Never stored, only processed in memory

## Third-Party Services
- Only connects to Google's Gemini API
- Follows [Google's Gemini API Privacy Policy](https://ai.google.dev/privacy)
- No other external services or analytics

## User Control
- Clear extension data anytime via Chrome settings
- Remove API key instantly through extension options
- Close sidebar to stop all processing
- All data clears when changing pages

## Updates
This privacy policy may be updated to reflect changes in functionality. Users will be notified of significant changes through extension updates.

## Contact
For privacy concerns or questions, please open an issue on our GitHub repository.

Last Updated: Jan 3 2025
