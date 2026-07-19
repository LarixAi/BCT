import Foundation

/// Shared active-trip state for CarPlay UI (updated from JS via DriverCarPlayPlugin).
final class CarPlayTripStore {
    static let shared = CarPlayTripStore()

    struct Trip: Equatable {
        let jobId: String
        let jobRoute: String?
        let leg: String
        let primaryAction: String
        let label: String
        let destinationLat: Double
        let destinationLng: Double
    }

    private(set) var activeTrip: Trip?
    var onChange: (() -> Void)?

    private init() {}

    func update(from payload: [String: Any]) {
        guard
            let jobId = payload["jobId"] as? String,
            let lat = payload["destinationLat"] as? Double ?? (payload["destinationLat"] as? NSNumber)?.doubleValue,
            let lng = payload["destinationLng"] as? Double ?? (payload["destinationLng"] as? NSNumber)?.doubleValue
        else {
            clear()
            return
        }

        activeTrip = Trip(
            jobId: jobId,
            jobRoute: payload["jobRoute"] as? String,
            leg: payload["leg"] as? String ?? "pickup",
            primaryAction: payload["primaryAction"] as? String ?? "open_app",
            label: payload["label"] as? String ?? "Trip",
            destinationLat: lat,
            destinationLng: lng
        )
        onChange?()
    }

    func clear() {
        guard activeTrip != nil else { return }
        activeTrip = nil
        onChange?()
    }
}
