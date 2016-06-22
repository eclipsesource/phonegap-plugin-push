#!/usr/bin/env node

var fs = require("fs"),
    path = require("path");

var rootdir = process.argv[2];
if (rootdir) {

  module.exports = function(context) {

    var cordova_util = context.requireCordovaModule("cordova-lib/src/cordova/util"),
        ConfigParser = context.requireCordovaModule("cordova-common").ConfigParser,
        projectRoot = cordova_util.isCordova(),
        xml = cordova_util.projectConfig(projectRoot),
        cfg = new ConfigParser(xml);

    // Cordova moved the platforms stuff; try both locations so we'll work for new and old file layouts.
    var platforms;
    try {
      platforms = context.requireCordovaModule('cordova-lib/src/cordova/platforms');
    } catch(e) {
      platforms = context.requireCordovaModule('cordova-lib/src/platforms/platforms');
    }
    var getProjectFile = function(platform, relPath) {
      return path.join(projectRoot, "platforms", platform, cfg.name(), relPath);
    };

    var replace = function(path, to_replace, replace_with) {
      var data = fs.readFileSync(path, "utf8");
      var result = data.replace(to_replace, replace_with);
      fs.writeFileSync(path, result, "utf8");
    };

    var updateIOSAppDelegate = function() {
      var appDelegate = getProjectFile("ios", "Classes/AppDelegate.m");
      var projectName = cfg.name();
      var importReplace = "#import \"AppDelegate.h\"";
      var defineReplace = "@interface AppDelegate ()";
      var methodsReplace = "#endif\n\n@end";
      replace(appDelegate, importReplace, importReplace + "\n#import \"PushPlugin.h\"");
      replace(appDelegate, defineReplace, "#define DISABLE_PUSH_NOTIFICATIONS\n\n" + defineReplace);
      replace(appDelegate, methodsReplace, "#endif\n\n- (void)application:(UIApplication *)application didRegisterUserNotificationSettings:(UIUserNotificationSettings *)notificationSettings {\n\tif (notificationSettings.types != UIUserNotificationTypeNone) {\n\t\t[application registerForRemoteNotifications];\n\t}\n}\n\n- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {\n\t[[NSNotificationCenter defaultCenter] postNotificationName:PUSH_NOTIF_REGISTER_SUCCESS object:deviceToken];\n}\n\n- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {\n\t[[NSNotificationCenter defaultCenter] postNotificationName:PUSH_NOTIF_REGISTER_FAILED object:error];\n}\n\n- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler {\n\tNSDictionary *aps = [userInfo objectForKey:@\"aps\"];\n\t[[NSNotificationCenter defaultCenter] postNotificationName:PUSH_NOTIF_NOTIFICATION_RECEIVED object:userInfo];\n\tcompletionHandler(aps ? UIBackgroundFetchResultNewData : UIBackgroundFetchResultNoData);\n}\n\n@end");
    };

    updateIOSAppDelegate();
  };

}