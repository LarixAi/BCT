import Capacitor
import Foundation

@objc(DriverCarPlayPlugin)
public class DriverCarPlayPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DriverCarPlayPlugin"
    public let jsName = "DriverCarPlay"
    public let pluginMethods: [CAPPluginMethod] = [
        .init(name: "updateActiveTrip", returnType: CAPPluginReturnPromise),
        .init(name: "clearActiveTrip", returnType: CAPPluginReturnPromise),
        .init(name: "isCarPlayAvailable", returnType: CAPPluginReturnPromise),
    ]

    @objc func updateActiveTrip(_ call: CAPPluginCall) {
        guard let jobId = call.getString("jobId") else {
            call.reject("jobId is required")
            return
        }

        var payload: [String: Any] = ["jobId": jobId]
        if let jobRoute = call.getString("jobRoute") { payload["jobRoute"] = jobRoute }
        if let leg = call.getString("leg") { payload["leg"] = leg }
        if let primaryAction = call.getString("primaryAction") { payload["primaryAction"] = primaryAction }
        if let label = call.getString("label") { payload["label"] = label }
        if let lat = call.getDouble("destinationLat") { payload["destinationLat"] = lat }
        if let lng = call.getDouble("destinationLng") { payload["destinationLng"] = lng }

        CarPlayTripStore.shared.update(from: payload)
        call.resolve(["ok": true])
    }

    @objc func clearActiveTrip(_ call: CAPPluginCall) {
        CarPlayTripStore.shared.clear()
        call.resolve(["ok": true])
    }

    @objc func isCarPlayAvailable(_ call: CAPPluginCall) {
        #if canImport(CarPlay)
        call.resolve(["available": true])
        #else
        call.resolve(["available": false])
        #endif
    }
}
