var _ = require('underscore');


Parse.Cloud.define("getFacebookFeeds", function (request, response) {

	var fbUserId = request.params.fbUserId;
	var limit = request.params.limit;

	Parse.Cloud.useMasterKey();
	var userQuery = new Parse.Query(Parse.User);
	userQuery.equalTo("fbUserId", fbUserId);
	userQuery.first
		({
			success: function (user) {
				var fbUserAccessToken = user.get('fbUserAccessToken')
				var path = 'https://graph.facebook.com/v2.9/me?fields=feed.limit(100){id,picture,type,attachments,from,created_time,likes.summary(1)}&access_token=' + fbUserAccessToken;

				Parse.Cloud.httpRequest({
					url: path
				}).then(function (httpResponse) {

					if (httpResponse.data.feed != undefined) {
						var feeds = httpResponse.data.feed.data;
						var myFeeds = new Array();
						for (var i = 0; i < feeds.length; i++) {
							if (feeds[i].type == "photo" && feeds[i].from.id == user.get('fbUserId')) {
								myFeeds.push(feeds[i]);
							}
						}
						return Parse.Promise.as().then(function () {
							var promise = Parse.Promise.as();
							
							_.each(myFeeds, function (feed) {
								
								promise = promise.then(function () {
									var promise = new Parse.Promise();

								}).then(function () {
									return updateFacebookFeed(user, feed);

								}).then(function () {
									return Parse.Promise.as();
								});
							});
							return promise;
						}).then(function () {
							response.success(1);
						}, function (error) {
							response.error("script failed with error.code: " + error.code + " error.message: " + error.message);
						});



					} else {
						response.error("error");
					}
				});
			}
		});
})


function updateFacebookFeed(user, FBfeed, callback) {

	var promise = new Parse.Promise();
	console.log("feed id ", FBfeed.id);
	var query = new Parse.Query("Feed");
	query.equalTo('feedId', FBfeed.id);
	query.find({
		success: function (results_feeds) {
			var feed;
			if (results_feeds.length > 0) {
				feed = results_feeds[0];
			} else {
				var Feed = Parse.Object.extend("Feed");
				feed = new Feed();
			}
			console.log("feed ", feed);
			if (feed != null) {
				feed.set("socialType", 1);
				feed.set("likes", FBfeed.likes.summary.total_count);
				feed.set("createdTime", FBfeed.created_time);
				feed.set("feedId", FBfeed.id);
				feed.set("user", user);
				

				feed.save({
					success: function (feed) {
						promise.resolve(1);
					},
					error: function (error) {
						promise.resolve(0);
					}
				});
			} else {
				promise.resolve(0);
			}
		},
		error: function (error) {
			promise.resolve(0);
		}
	});

}
