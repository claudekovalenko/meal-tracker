import SwiftData
import SwiftUI

@main
struct MealTrackerApp: App {
    var body: some Scene {
        WindowGroup {
            TodayView()
        }
        .modelContainer(for: FoodEntry.self)
    }
}
