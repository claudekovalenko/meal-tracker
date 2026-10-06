import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss

    @AppStorage(GoalKeys.baseCalories) private var baseCalories = Goals.default.baseCalories
    @AppStorage(GoalKeys.protein) private var protein = Goals.default.protein
    @AppStorage(GoalKeys.carbs) private var carbs = Goals.default.carbs
    @AppStorage(GoalKeys.fat) private var fat = Goals.default.fat
    @AppStorage(GoalKeys.eatBackPercent) private var eatBackPercent = Goals.default.eatBackFraction * 100

    @State private var apiKey = Keychain.string(for: NutritionEstimator.apiKeyAccount) ?? ""
    @State private var healthMessage: String?

    private var macroCalories: Double { protein * 4 + carbs * 4 + fat * 9 }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    goalField("Calories", value: $baseCalories, unit: "kcal")
                    goalField("Protein", value: $protein, unit: "g")
                    goalField("Carbs", value: $carbs, unit: "g")
                    goalField("Fat", value: $fat, unit: "g")
                } header: {
                    Text("Daily goals (rest day)")
                } footer: {
                    Text("Your macros add up to \(Int(macroCalories)) kcal. Set calories for a day "
                         + "without exercise; workouts from Apple Health are added on top.")
                }

                Section {
                    VStack(alignment: .leading) {
                        Text("Eat back \(Int(eatBackPercent))% of active calories")
                        Slider(value: $eatBackPercent, in: 0...100, step: 5)
                    }
                    Button("Connect Apple Health") {
                        Task {
                            do {
                                try await HealthKitService.shared.requestAuthorization()
                                healthMessage = "If you don't see your workouts, allow access in "
                                    + "Settings › Health › Data Access & Devices › Meal Tracker."
                            } catch {
                                healthMessage = error.localizedDescription
                            }
                        }
                    }
                } header: {
                    Text("Exercise adjustment")
                } footer: {
                    Text(healthMessage ?? "Watches and phones tend to overestimate calories burned, "
                         + "so eating back only part of them (often 50–75%) is a common approach. "
                         + "Extra calories go to carbs and fat; protein stays the same.")
                }

                Section {
                    SecureField("sk-ant-...", text: $apiKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: {
                    Text("Anthropic API key")
                } footer: {
                    Text("Used to calculate macros from your meal descriptions. Stored in the device Keychain. "
                         + "Get one at console.anthropic.com.")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        Keychain.set(apiKey.trimmingCharacters(in: .whitespacesAndNewlines),
                                     for: NutritionEstimator.apiKeyAccount)
                        dismiss()
                    }
                }
            }
        }
    }

    private func goalField(_ label: String, value: Binding<Double>, unit: String) -> some View {
        LabeledContent(label) {
            HStack {
                TextField(label, value: value, format: .number)
                    .keyboardType(.numberPad)
                    .multilineTextAlignment(.trailing)
                Text(unit).foregroundStyle(.secondary)
            }
        }
    }
}
