import SwiftData
import SwiftUI

/// Edit or delete an entry that's already in the log.
struct EntryEditView: View {
    @Bindable var entry: FoodEntry

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var deleteOnDismiss = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Food", text: $entry.name)
                    TextField("Portion", text: $entry.portion)
                    Picker("Meal", selection: $entry.mealRaw) {
                        ForEach(MealType.allCases) { Text($0.title).tag($0.rawValue) }
                    }
                }
                Section("Nutrition") {
                    MacroFields(calories: $entry.calories, protein: $entry.protein,
                                carbs: $entry.carbs, fat: $entry.fat)
                }
                Section {
                    Button("Delete Entry", role: .destructive) {
                        // Delete after the sheet closes so the form never reads a deleted model.
                        deleteOnDismiss = true
                        dismiss()
                    }
                }
            }
            .navigationTitle("Edit Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
        .onDisappear {
            if deleteOnDismiss { context.delete(entry) }
        }
    }
}
