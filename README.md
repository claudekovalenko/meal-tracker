# Meal Tracker

An iPhone app for hitting your daily calorie and macro goals.

- **Log food in plain English.** Type what you ate ("2 scrambled eggs, toast with butter, black coffee") and Claude breaks it into items with calories, protein, carbs, and fat. You can adjust any number before adding it.
- **Exercise-adjusted targets.** Reads *active calories* from Apple Health and adds a share of them (50% by default, adjustable) to that day's calorie target. The extra calories go to carbs and fat; protein stays fixed.
- **Daily dashboard.** Calories remaining, progress bars for each macro, food grouped by meal, and arrows to look back at earlier days. Tap an entry to edit it, or swipe to delete.

## Requirements

- A Mac with **Xcode 15 or newer**
- An iPhone on **iOS 17+** (Apple Health data isn't available in the simulator)
- An **Anthropic API key** from [console.anthropic.com](https://console.anthropic.com). Analyzing a meal typically costs a few cents or less.

## Build and run

The Xcode project is generated from `project.yml` with [XcodeGen](https://github.com/yonaskolb/XcodeGen):

```sh
brew install xcodegen
xcodegen
open MealTracker.xcodeproj
```

Then in Xcode:

1. Select the **MealTracker** target → **Signing & Capabilities**, and pick your Team. A free Apple ID works; with a free account the app has to be reinstalled every 7 days.
2. If Xcode says the bundle ID is taken, change `com.example.mealtracker` to something unique (for example `com.yourname.mealtracker`).
3. Plug in your iPhone, select it as the run destination, and press **Run**.

On first launch, allow access to Active Energy when iOS asks. Then open **Settings** (gear icon), set your goals, and paste in your API key.

## Choosing your goals

Set **Calories** to what you'd eat on a rest day, meaning your maintenance or deficit target at a *sedentary* activity level. Apple Health's active calories get added on top, so a base target that already assumes exercise would count it twice.

## Project layout

```
MealTracker/
  Models/      Macros, FoodEntry (SwiftData), Goals + exercise adjustment math
  Services/    HealthKitService, NutritionEstimator (Claude API), Keychain
  Views/       TodayView, AddMealView, EntryEditView, SettingsView
MealTrackerTests/  Unit tests for target math and response decoding
```

Run tests with **⌘U** in Xcode.

## Notes

- Your log is stored on the device with SwiftData. The API key is kept in the iOS Keychain and sent only to `api.anthropic.com`.
- Macros are estimates. Check items from restaurants or anything with a nutrition label, and edit them if needed.
