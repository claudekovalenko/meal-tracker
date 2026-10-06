import XCTest
@testable import MealTracker

final class GoalsTests: XCTestCase {
    private let goals = Goals(baseCalories: 2000, protein: 150, carbs: 200, fat: 67, eatBackFraction: 0.5)

    func testNoExerciseKeepsBaseTargets() {
        let targets = goals.adjustedTargets(activeCalories: 0)
        XCTAssertEqual(targets, Macros(calories: 2000, protein: 150, carbs: 200, fat: 67))
    }

    func testAddsEatBackShareOfActiveCalories() {
        let targets = goals.adjustedTargets(activeCalories: 600)
        XCTAssertEqual(targets.calories, 2300, accuracy: 0.001)
        XCTAssertEqual(targets.protein, 150, "protein should not scale with exercise")
    }

    func testBonusSplitsBetweenCarbsAndFatByCalories() {
        let targets = goals.adjustedTargets(activeCalories: 600)
        let addedCalories = (targets.carbs - 200) * 4 + (targets.fat - 67) * 9
        XCTAssertEqual(addedCalories, 300, accuracy: 0.001)

        // Baseline: 800 kcal carbs vs 603 kcal fat.
        let carbShare = 800.0 / 1403.0
        XCTAssertEqual((targets.carbs - 200) * 4, 300 * carbShare, accuracy: 0.001)
    }

    func testClampsEatBackFractionAndNegativeCalories() {
        var g = goals
        g.eatBackFraction = 1.5
        XCTAssertEqual(g.adjustedTargets(activeCalories: 400).calories, 2400, accuracy: 0.001)
        XCTAssertEqual(goals.adjustedTargets(activeCalories: -100).calories, 2000, accuracy: 0.001)
    }

    func testAllBonusGoesToCarbsWhenNoCarbOrFatGoal() {
        let g = Goals(baseCalories: 1800, protein: 150, carbs: 0, fat: 0, eatBackFraction: 1)
        let targets = g.adjustedTargets(activeCalories: 400)
        XCTAssertEqual(targets.carbs, 100, accuracy: 0.001)
        XCTAssertEqual(targets.fat, 0, accuracy: 0.001)
    }

    func testDecodesStructuredOutput() throws {
        let json = """
        {"items":[{"name":"Scrambled eggs","portion":"2 large","calories":180,
          "protein_g":12.5,"carbs_g":1.5,"fat_g":13.6}],"notes":"Cooked with 1 tsp butter."}
        """
        let estimate = try JSONDecoder().decode(MealEstimate.self, from: Data(json.utf8))
        XCTAssertEqual(estimate.items.count, 1)
        XCTAssertEqual(estimate.items[0].protein, 12.5)
        XCTAssertEqual(estimate.notes, "Cooked with 1 tsp butter.")
    }
}
