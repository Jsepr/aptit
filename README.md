# Aptit - Smart Recipe Book

Aptit is a smart recipe book application powered by AI. It allows you to extract recipes from URLs, convert measurements between metric and imperial systems, and organize your culinary collection.

## Features

- **AI Recipe Extraction**: Automatically extract ingredients and instructions from any recipe URL using Google Gemini.
- **Smart Conversions**: Instantly convert recipes between Metric and Imperial units.
- **AI Image Generation**: Generates beautiful anime-style illustrations for your dishes if none are provided.
- **Ingredient Insights**: Get explanations and substitutes for ingredients.
- **Local Storage**: Your library is preserved locally on your device.

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React Framework)
- **Styling**: Tailwind CSS
- **AI**: Google Gemini API (`@google/genai`)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- A Google Gemini API Key

### Installation

1.  Clone the repository and install dependencies:

    ```bash
    npm install
    ```

2.  Set up environment variables:

    Create a `.env` file in the root directory (copy from `.env.example` if available) and add your API key:

    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

### Running Locally

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Building for Production

To build the application for production:

```bash
npm run build
```

To start the production server:

```bash
npm run start
```
