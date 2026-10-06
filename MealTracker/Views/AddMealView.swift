import SwiftData
import SwiftUI

/// Describe a meal in plain English, let Claude estimate the macros,
/// review/adjust them, then add them to the log.
struct AddMealView: View {
    let day: Date

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @State private var meal = MealType.suggested()
    @State private var mealText = ""
    @State private var items: [EstimatedItem] = []
    @State private var notes = ""
    @State private var isEstimating = false
    @State private var errorMessage: String?
    @FocusState private var descriptionFocused: Bool

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Meal", selection: $meal) {
                        ForEach(MealType.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }

                Section {
                    TextField("e.g. Chipotle chicken burrito bowl with white rice, black beans, cheese and guac",
                              text: $mealText, axis: .vertical)
                        .lineLimit(3...8)
                        .focused($descriptionFocused)
                    Button {
                        Task { await estimate() }
                    } label: {
                        HStack {
                            Text(items.isEmpty ? "Calculate Macros" : "Recalculate")
                            if isEstimating { Spacer(); ProgressView() }
                        }
                    }
                    .disabled(mealText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isEstimating)
                } header: {
                    Text("What did you eat?")
                } footer: {
                    if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
                }

                if !items.isEmpty {
                    Section {
                        ForEach($items) { $item in ItemEditor(item: $item) }
                            .onDelete { items.remove(atOffsets: $0) }
                    } header: {
                        Text("Review & adjust")
                    } footer: {
                        if !notes.isEmpty { Text(notes) }
                    }

                    Section("Total") {
                        let total = items.reduce(Macros.zero) { $0 + $1.macros }
                        LabeledContent("Calories", value: "\(Int(total.calories)) kcal")
                        LabeledContent("Protein / Carbs / Fat",
                                       value: "\(Int(total.protein)) / \(Int(total.carbs)) / \(Int(total.fat)) g")
                    }
                }
            }
            .navigationTitle("Log Food")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") { save() }.disabled(items.isEmpty)
                }
            }
            .onAppear { descriptionFocused = true }
        }
    }

    private func estimate() async {
        descriptionFocused = false
        isEstimating = true
        errorMessage = nil
        defer { isEstimating = false }
        do {
            let result = try await NutritionEstimator().estimate(mealText)
            items = result.items
            notes = result.notes
            if items.isEmpty { errorMessage = "Couldn't find any food in that description." }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func save() {
        // Past days get logged at midday so they land on the right date.
        let date = Calendar.current.isDateInToday(day)
            ? Date.now
            : Calendar.current.date(bySettingHour: 12, minute: 0, second: 0, of: day) ?? day
        for item in items {
            context.insert(FoodEntry(date: date, meal: meal, name: item.name,
                                     portion: item.portion, macros: item.macros))
        }
        dismiss()
    }
}

/// Editable name, portion and macros for one estimated item.
private struct ItemEditor: View {
    @Binding var item: EstimatedItem

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            TextField("Food", text: $item.name).font(.headline)
            TextField("Portion", text: $item.portion).font(.subheadline).foregroundStyle(.secondary)
            MacroFields(calories: $item.calories, protein: $item.protein, carbs: $item.carbs, fat: $item.fat)
        }
        .padding(.vertical, 4)
    }
}

/// A compact row of four numeric fields: kcal, protein, carbs, fat.
struct MacroFields: View {
    @Binding var calories: Double
    @Binding var protein: Double
    @Binding var carbs: Double
    @Binding var fat: Double

    var body: some View {
        HStack(spacing: 8) {
            field("kcal", $calories)
            field("P g", $protein)
            field("C g", $carbs)
            field("F g", $fat)
        }
    }

    private func field(_ label: String, _ value: Binding<Double>) -> some View {
        VStack(spacing: 2) {
            TextField(label, value: value, format: .number.precision(.fractionLength(0...1)))
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.center)
                .textFieldStyle(.roundedBorder)
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
    }
}
