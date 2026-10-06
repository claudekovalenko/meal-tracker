import Foundation
import HealthKit

/// Reads active calories burned from Apple Health.
final class HealthKitService {
    static let shared = HealthKitService()

    private let store = HKHealthStore()
    private let activeEnergy = HKQuantityType(.activeEnergyBurned)

    var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    /// Shows the Health permission sheet the first time; a no-op afterwards.
    func requestAuthorization() async throws {
        guard isAvailable else { return }
        try await store.requestAuthorization(toShare: [], read: [activeEnergy])
    }

    /// Total active energy (kcal) recorded for the calendar day containing `day`.
    ///
    /// Returns 0 when there is no data. Note that HealthKit also returns no
    /// data (rather than an error) when read access was denied.
    func activeCalories(on day: Date) async throws -> Double {
        guard isAvailable else { return 0 }
        let start = Calendar.current.startOfDay(for: day)
        let end = Calendar.current.date(byAdding: .day, value: 1, to: start)!
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end)
        let query = HKStatisticsQueryDescriptor(
            predicate: .quantitySample(type: activeEnergy, predicate: predicate),
            options: .cumulativeSum
        )
        do {
            let stats = try await query.result(for: store)
            return stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
        } catch let error as HKError where error.code == .errorNoData {
            return 0
        }
    }
}
