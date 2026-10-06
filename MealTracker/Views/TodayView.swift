import SwiftData
import SwiftUI

/// Home screen: the selected day's targets, progress, and logged food.
struct TodayView: View {
    @Environment(\.scenePhase) private var scenePhase

    @AppStorage(GoalKeys.baseCalories) private var baseCalories = Goals.default.baseCalories
    @AppStorage(GoalKeys.protein) private var protein = Goals.default.protein
    @AppStorage(GoalKeys.carbs) private var carbs = Goals.default.carbs
    @AppStorage(GoalKeys.fat) private var fat = Goals.default.fat
    @AppStorage(GoalKeys.eatBackPercent) private var eatBackPercent = Goals.default.eatBackFraction * 100

    @State private var day = Calendar.current.startOfDay(for: .now)
    @State private var activeCalories: Double = 0
    @State private var showingAddMeal = false
    @State private var showingSettings = false

    private var goals: Goals {
        Goals(baseCalories: baseCalories, protein: protein, carbs: carbs, fat: fat,
              eatBackFraction: eatBackPercent / 100)
    }

    private var isToday: Bool { Calendar.current.isDateInToday(day) }

    var body: some View {
        NavigationStack {
            DayLogView(day: day, goals: goals, activeCalories: activeCalories)
                .refreshable { await loadActiveCalories() }
                .navigationTitle(isToday ? "Today" : day.formatted(.dateTime.weekday(.wide).month().day()))
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button { showingSettings = true } label: { Image(systemName: "gearshape") }
                    }
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        Button { shiftDay(-1) } label: { Image(systemName: "chevron.left") }
                        Button { shiftDay(1) } label: { Image(systemName: "chevron.right") }
                            .disabled(isToday)
                    }
                    ToolbarItem(placement: .bottomBar) {
                        Button { showingAddMeal = true } label: {
                            Label("Log Food", systemImage: "plus.circle.fill").labelStyle(.titleAndIcon)
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
                .sheet(isPresented: $showingAddMeal) { AddMealView(day: day) }
                .sheet(isPresented: $showingSettings) { SettingsView() }
        }
        .task(id: day) {
            try? await HealthKitService.shared.requestAuthorization()
            await loadActiveCalories()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await loadActiveCalories() } }
        }
    }

    private func shiftDay(_ offset: Int) {
        day = Calendar.current.date(byAdding: .day, value: offset, to: day) ?? day
    }

    private func loadActiveCalories() async {
        activeCalories = (try? await HealthKitService.shared.activeCalories(on: day)) ?? 0
    }
}

/// The list for a single day. Split out so its `@Query` can filter by date.
private struct DayLogView: View {
    @Environment(\.modelContext) private var context
    @Query private var entries: [FoodEntry]

    let goals: Goals
    let activeCalories: Double
    @State private var editing: FoodEntry?

    init(day: Date, goals: Goals, activeCalories: Double) {
        let start = Calendar.current.startOfDay(for: day)
        let end = Calendar.current.date(byAdding: .day, value: 1, to: start)!
        _entries = Query(filter: #Predicate<FoodEntry> { $0.date >= start && $0.date < end },
                         sort: \FoodEntry.date)
        self.goals = goals
        self.activeCalories = activeCalories
    }

    var body: some View {
        let targets = goals.adjustedTargets(activeCalories: activeCalories)
        let eaten = entries.reduce(Macros.zero) { $0 + $1.macros }

        List {
            Section {
                CalorieSummary(eaten: eaten.calories, target: targets.calories)
                MacroBar(name: "Protein", eaten: eaten.protein, target: targets.protein, tint: .blue)
                MacroBar(name: "Carbs", eaten: eaten.carbs, target: targets.carbs, tint: .orange)
                MacroBar(name: "Fat", eaten: eaten.fat, target: targets.fat, tint: .purple)
            } footer: {
                if activeCalories > 0 {
                    Text("Includes +\(Int(targets.calories - goals.baseCalories)) kcal for exercise: "
                         + "\(Int(goals.eatBackFraction * 100))% of \(Int(activeCalories)) active kcal from Apple Health.")
                } else {
                    Text("No active calories from Apple Health yet for this day.")
                }
            }

            ForEach(MealType.allCases) { meal in
                let items = entries.filter { $0.meal == meal }
                if !items.isEmpty {
                    Section {
                        ForEach(items) { entry in
                            Button { editing = entry } label: {
                                EntryRow(entry: entry).foregroundStyle(Color.primary)
                            }
                        }
                        .onDelete { offsets in
                            for index in offsets { context.delete(items[index]) }
                        }
                    } header: {
                        HStack {
                            Text(meal.title)
                            Spacer()
                            Text("\(Int(items.reduce(0) { $0 + $1.calories })) kcal")
                        }
                    }
                }
            }

            if entries.isEmpty {
                ContentUnavailableView("Nothing logged yet", systemImage: "fork.knife",
                                       description: Text("Tap Log Food and describe what you ate."))
            }
        }
        .sheet(item: $editing) { EntryEditView(entry: $0) }
    }
}

private struct CalorieSummary: View {
    let eaten: Double
    let target: Double

    var body: some View {
        let remaining = target - eaten
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading) {
                Text(remaining >= 0 ? "\(Int(remaining))" : "\(Int(-remaining))")
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .foregroundStyle(remaining >= 0 ? Color.primary : Color.red)
                Text(remaining >= 0 ? "kcal remaining" : "kcal over")
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing) {
                Text("\(Int(eaten)) eaten")
                Text("\(Int(target)) target").foregroundStyle(.secondary)
            }
            .font(.subheadline)
        }
        .padding(.vertical, 4)
    }
}

struct MacroBar: View {
    let name: String
    let eaten: Double
    let target: Double
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(name)
                Spacer()
                Text("\(Int(eaten)) / \(Int(target)) g").foregroundStyle(.secondary)
            }
            .font(.subheadline)
            ProgressView(value: target > 0 ? min(eaten / target, 1) : 0)
                .tint(eaten > target * 1.05 ? .red : tint)
        }
    }
}

private struct EntryRow: View {
    let entry: FoodEntry

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.name)
                Text("\(entry.portion) · P \(Int(entry.protein)) · C \(Int(entry.carbs)) · F \(Int(entry.fat))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text("\(Int(entry.calories))").monospacedDigit()
        }
    }
}
