import CarPlay
import UIKit

@objc(CarPlaySceneDelegate)
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    private var interfaceController: CPInterfaceController?

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = interfaceController
        CarPlayTripStore.shared.onChange = { [weak self] in
            self?.reloadRootTemplate()
        }
        reloadRootTemplate()
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        CarPlayTripStore.shared.onChange = nil
        self.interfaceController = nil
    }

    private func reloadRootTemplate() {
        guard let interfaceController else { return }

        let template = buildRootTemplate()
        interfaceController.setRootTemplate(template, animated: true, completion: nil)
    }

    private func buildRootTemplate() -> CPListTemplate {
        if let trip = CarPlayTripStore.shared.activeTrip {
            return activeTripTemplate(trip)
        }
        return idleTemplate()
    }

    private func idleTemplate() -> CPListTemplate {
        let item = CPListItem(text: "No active trip", detailText: "Open Veyvio on your iPhone to start a job")
        item.isEnabled = false
        let section = CPListSection(items: [item])
        let template = CPListTemplate(title: "Veyvio Driver", sections: [section])
        template.tabTitle = "Trip"
        return template
    }

    private func activeTripTemplate(_ trip: CarPlayTripStore.Trip) -> CPListTemplate {
        let legLabel = trip.leg == "dropoff" ? "Drop-off" : "Pickup"
        let summary = CPListItem(
            text: trip.label,
            detailText: "\(legLabel) · Job \(trip.jobId.prefix(8))"
        )
        summary.isEnabled = false

        let coords = CPListItem(
            text: "Destination",
            detailText: String(format: "%.5f, %.5f", trip.destinationLat, trip.destinationLng)
        )
        coords.isEnabled = false

        let actionTitle: String
        switch trip.primaryAction {
        case "arrive":
            actionTitle = "I've arrived"
        case "complete_stop":
            actionTitle = "Complete stop"
        default:
            actionTitle = "Open on iPhone"
        }

        let actionItem = CPListItem(text: actionTitle, detailText: "Continue in Veyvio Driver")
        actionItem.handler = { _, completion in
            Self.openPhoneApp(jobRoute: trip.jobRoute, jobId: trip.jobId)
            completion()
        }

        let section = CPListSection(items: [summary, coords, actionItem])
        let template = CPListTemplate(title: "Active trip", sections: [section])
        template.tabTitle = "Trip"
        return template
    }

    private static func openPhoneApp(jobRoute: String?, jobId: String) {
        var urlString = "ridova-driver://"
        if let jobRoute, !jobRoute.isEmpty {
            urlString = "ridova-driver://\(jobRoute.trimmingCharacters(in: CharacterSet(charactersIn: "/")))"
        } else {
            urlString = "ridova-driver://job/\(jobId)"
        }

        if let url = URL(string: urlString) {
            DispatchQueue.main.async {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }
    }
}
