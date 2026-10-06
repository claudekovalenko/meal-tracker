import Foundation
import SwiftData

/// One logged food item, e.g. "2 scrambled eggs".
@Model
final class FoodEntry {
    var date: Date
    var mealRaw: String
    var name: String
    var portion: String
    var calories: Double
    var protein: Double
    var carbs: Double
    var fat: Double

    init(date: Date, meal: MealType, name: String, portion: String, macros: Macros) {
        self.date = date
        self.mealRaw = meal.rawValue
        self.name = name
        self.portion = portion
        self.calories = macros.calories
        self.protein = macros.protein
        self.carbs = macros.carbs
        self.fat = macros.fat
    }

    var meal: MealType { MealType(rawValue: mealRaw) ?? .snack }
    var macros: Macros { Macros(calories: calories, protein: protein, carbs: carbs, fat: fat) }
}
