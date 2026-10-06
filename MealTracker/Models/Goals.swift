import Foundation

/// The user's baseline daily goals, before any exercise adjustment.
///
/// `baseCalories` should be the target for a day with no logged exercise
/// (i.e. based on a sedentary activity level), since active calories from
/// Apple Health are added on top.
struct Goals: Equatable {
    var baseCalories: Double
    var protein: Double
    var carbs: Double
    var fat: Double
    /// Fraction (0...1) of Health-reported active calories to add to the day's budget.
    var eatBackFraction: Double

    static let `default` = Goals(baseCalories: 2000, protein: 150, carbs: 200, fat: 67, eatBackFraction: 0.5)

    /// Today's targets after adding back a share of the calories burned.
    ///
    /// Protein stays fixed (it's driven by body weight, not activity). The
    /// extra calories are split between carbs and fat in the same ratio as
    /// their baseline calorie contribution.
    func adjustedTargets(activeCalories: Double) -> Macros {
        let bonus = max(0, activeCalories) * min(max(eatBackFraction, 0), 1)
        let carbCalories = carbs * 4
        let fatCalories = fat * 9
        let carbShare = (carbCalories + fatCalories) > 0 ? carbCalories / (carbCalories + fatCalories) : 1

        return Macros(
            calories: baseCalories + bonus,
            protein: protein,
            carbs: carbs + bonus * carbShare / 4,
            fat: fat + bonus * (1 - carbShare) / 9
        )
    }
}

/// UserDefaults keys shared by `@AppStorage` in the views.
enum GoalKeys {
    static let baseCalories = "goal.baseCalories"
    static let protein = "goal.protein"
    static let carbs = "goal.carbs"
    static let fat = "goal.fat"
    static let eatBackPercent = "goal.eatBackPercent"
}
