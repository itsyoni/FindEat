/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: "notification-service",
  name: "FindEatNotificationService",
  displayName: "FindEat Notification Service",
  bundleIdentifier: ".notification-service",
  deploymentTarget: "16.4",
});
