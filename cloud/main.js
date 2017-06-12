


var _ = require('underscore');

Parse.Cloud.define("test", function (request, response) {
	//console.log('test test test test test');
	//console.log(request.params.body);
	console.log(JSON.stringify(request.params.body));
});

Parse.Cloud.define("countLikeFriends", function (request, response) {

	//var userId = request.params.userId;
	var fbUserId = request.params.fbUserId;
	var fbUserAccesstoken = request.params.fbUserAccesstoken;

	Parse.Cloud.httpRequest({
		url: 'https://graph.facebook.com/v2.6/me?fields=friends.limit(1000)&access_token=' + fbUserAccesstoken,
		success: function (httpResponse) {


			console.log('response data' + httpResponse.data.friends.data.length);

			var friends = httpResponse.data.friends.data;
			var arrayReturn = new Array();

			var promiseSeries = Parse.Promise.as();

			return Parse.Promise.as().then(function () {
				var promise = Parse.Promise.as();

				_.each(friends, function (friend) {
					promise = promise.then(function () {

						console.log('friend id' + friend.id);
						console.log('friend name' + friend.name);

						var jsonResponse = {};
						jsonResponse['friendId'] = friend.id;
						jsonResponse['friendName'] = friend.name;

						Parse.Cloud.httpRequest({
							url: 'https://graph.facebook.com/v2.6/' + friend.id + '?fields=photos.limit(100){from,likes.summary(1)}&access_token=' + fbUserAccesstoken,
							success: function (httpResponse) {

								console.log('photos.length' + photos.length);

								var photos = httpResponse.data.photos.data;
								var total_like = 0;

								for (var i = 0; i < photos.length; i++) {

									if (photos[i].from.id == friend.id && photos[i].likes.summary.total_count) {

										total_like = total_like + photos[i].likes.summary.total_count;

										console.log('total_like' + total_like);
									}

								}



								jsonResponse['totalLike'] = total_like;

								console.log('total_like' + total_like);


								arrayReturn.push(jsonResponse);



								return Parse.Promise.as();


							},
							error: function (httpResponse) {

								console.log('error1 ' + httpResponse.data.error.message);

								response.error("?fields=me error.code: " + error.code + " error.message: " + error.message);

							}
						});


					});

				});

				return promise;

			}).then(function () {


				response.success(arrayReturn);

			}, function (error) {

				response.error("script failed with error.code: " + error.code + " error.message: " + error.message);

			});




		},
		error: function (httpResponse) {

			console.log('error1 ' + httpResponse.data.error.message);

			response.error("?fields=me error.code: " + error.code + " error.message: " + error.message);

		}
	});


});

function getMonday(d) {
	d = new Date(d);
	var day = d.getDay(),
		diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
	return new Date(d.setDate(diff));
}

function getFriday(d) {
	d = getMonday(d);
	return new Date(d.setDate(d.getDate() + 4));
}

function getNextWeekMonday(d) {
	var d = new Date(d);
	var diff = d.getDate() - d.getDay() + 1;
	if (d.getDay() == 0)
		diff -= 7;
	diff += 7;
	return new Date(d.setDate(diff));
}

function getNextWeekFriday(d) {
	var d = getNextWeekMonday(d);
	return new Date(d.setDate(d.getDate() + 4));
}

/********************* TEST ********************/

Parse.Cloud.define("doReturnChallengeFeeds", function (request, response) {
	var challengeId = request.params.challengeId;
	var result = new Array();

	console.log("[doReturnChallengeFeeds] " + challengeId);
	var query = new Parse.Query("Challenge");
	query.equalTo("objectId", challengeId);
	query.first
		({
			success: function (challenge) {
				console.log("[doReturnChallengeFeeds] - challenge" + challenge.id);
				var fbUserFeeds = new Array();
				var instagramUserFeeds = new Array();
				var challengeUsers = challenge.relation('users');
				var query = challengeUsers.query();
				query.each(function (userObject) {
					console.log("[doReturnChallengeFeeds] - userObject" + userObject.get('name'));
					var promise = Parse.Promise.as();
					promise = promise.then(function () {
						return getFBUserFeeds(challenge, userObject);
					}).then(function (userFeeds) {
						fbUserFeeds = userFeeds;
						console.log("[doReturnChallengeFeeds] - fbUserFeeds " + fbUserFeeds);
						return getInstagramUserFeeds(challenge, userObject);
					}).then(function (userFeeds) {
						instagramUserFeeds = userFeeds;
						console.log("[doReturnChallengeFeeds] - instagramUserFeeds " + instagramUserFeeds);
						var socialFeeds = new Array();
						for (var i = 0; i < fbUserFeeds.length; i++) {
							socialFeeds.push(fbUserFeeds[i]);
						}
						for (var i = 0; i < instagramUserFeeds.length; i++) {
							socialFeeds.push(instagramUserFeeds[i]);
						}
						var userJson = {};
						userJson["userId"] = userObject.id;
						userJson['fbUserId'] = userObject.get('fbUserId');
						userJson['name'] = userObject.get('name');
						userJson['fbFeeds'] = fbUserFeeds;
						userJson['instagramFeeds'] = instagramUserFeeds;
						userJson['socialFeeds'] = socialFeeds;
						result.push(userJson);
						console.log("[doReturnChallengeFeeds] - result" + result);
					});
					return promise;
				}).then(function () {
					response.success(result);
				});
			},
			error: function () {
				console.log("[doReturnChallengeFeeds] - error query.get challengeId");
				response.error("[doReturnChallengeFeeds] - error query.get challengeId");
			}
		});
});

function getInstagramUserFeeds(challenge, user, callback) {
	var userFeeds = new Array();
	var fbStartDateTimestamp = challenge.get('fbStartDateTimestamp');
	var fbEndDateTimestamp = challenge.get('fbEndDateTimestamp');
	var instagramAccessToken = user.get('instagramAccessToken');
	console.log("instagramAccessToken: " + instagramAccessToken + " ***");

	if (instagramAccessToken != null) {
		var path = 'https://api.instagram.com/v1/users/self/media/recent?count=200&access_token=' + instagramAccessToken;
		console.log("path: " + path);
		var promise = new Parse.Promise();
		Parse.Cloud.httpRequest({
			url: path
		}).then(function (httpResponse) {
			//console.log("********* " + user.get('name') + "**********");
			//console.log(JSON.stringify(httpResponse.data.data));
			//console.log("********************************************");
			if (httpResponse.data.data != undefined) {
				var feeds = httpResponse.data.data;
				console.log('instagram feed count ' + feeds.length + ', name: ' + user.get('name'));
				for (var i = 0; i < feeds.length; i++) {
					if (feeds[i].created_time >= fbStartDateTimestamp && feeds[i].created_time <= fbEndDateTimestamp) {
						feeds[i]['fbUserId'] = user.get('fbUserId');
						feeds[i]['socialType'] = 1;
						userFeeds.push(feeds[i]);
					}
				}
				return userFeeds;
			} else {
				console.log("error httpResponse.data undefined")
				return userFeeds;
			}
		}).then(function (userFeeds) {
			console.log('instagram userFeeds ' + userFeeds + ' name: ' + user.get('name'));
			promise.resolve(userFeeds);
		});
		return promise;
	} else {
		console.log("no instagramAccessToken");
		var promise = new Parse.Promise();
		promise.resolve(userFeeds);
		return promise;
	}

}

function getFBUserFeeds(challenge, user, callback) {

	var userFeeds = new Array();
	var fbStartDateTimestamp = challenge.get('fbStartDateTimestamp');
	var fbEndDateTimestamp = challenge.get('fbEndDateTimestamp');
	var fbUserAccessToken = user.get('fbUserAccessToken')
	var path = 'https://graph.facebook.com/v2.6/me?fields=feed.since(' + fbStartDateTimestamp + ').until(' + fbEndDateTimestamp + ').limit(100){type,full_picture,from,created_time,likes.summary(1)}&access_token=' + fbUserAccessToken;
	console.log("path: " + path);
	var promise = new Parse.Promise();
	Parse.Cloud.httpRequest({
		url: path
	}).then(function (httpResponse) {
		if (httpResponse.data.feed != undefined) {
			console.log('feed count ' + httpResponse.data.feed.data.length + ', name: ' + user.get('name'));
			var feeds = httpResponse.data.feed.data;
			for (var i = 0; i < feeds.length; i++) {
				if (feeds[i].type == "photo" && feeds[i].from.id == user.get('fbUserId')) {
					feeds[i]['fbUserId'] = user.get('fbUserId');
					feeds[i]['socialType'] = 0;
					userFeeds.push(feeds[i]);
				}
			}
			return userFeeds;
		} else {
			console.log("error httpResponse.data.feed undefined")
			return userFeeds;
		}
	}).then(function (userFeeds) {
		console.log('userFeeds ' + userFeeds + ' name: ' + user.get('name'));
		promise.resolve(userFeeds);
	});
	return promise;
}


Parse.Cloud.define("doReturnCurrentWeekRanking", function (request, response) {

	var fbUserId = request.params.fbUserId;
	var responseArray = new Array();

	Parse.Cloud.useMasterKey();
	var queryLike = new Parse.Query("Like");
	queryLike.descending("LikeCount")
	queryLike.find.then(function (likeResults) {
		var promises = [];
		_.each(likeResults, function (like) {
			promises.push((function (responseArray) {
				var promise = new Parse.Promise();

				return promise;
			})(responseArray));
		});
		return Parse.Promise.when(promises);
	})
		.then(function () {
			console.log('like count updated');
			response.success(responseArray);
		}, function (error) {
			response.error('error like count updated');
		});


});

/********************* PROD ********************/

function countInstagramLikeForUsersChallenge(challenge, callback) {
	var fbUsersId = challenge.relation('users');
	console.log(JSON.stringify(fbUsersId));
	var startDate = challenge.get('startTime');
	var endDate = challenge.get('endTime');

	var incrementalWeek = challenge.get('incrementalWeek');

	console.log('countInstagramLikeForUsersChallenge fbUsersId.length: ' + fbUsersId.length + ' , startDate: ' + startDate + ' , endDate: ' + endDate + ' , incrementalWeek: ' + incrementalWeek);

	var usersArray = new Array();
	var promise = new Parse.Promise();

	//recupero tutti gli user object
	var query = fbUsersId.query();
	query.each(function (userObject) {
		console.log("userObject " + userObject.get('name'));
		var userJson = {};
		userJson['fbUserId'] = userObject.get('fbUserId');
		userJson['name'] = userObject.get('name');

		var promise2 = Parse.Promise.as();
		promise2 = promise2.then(function () {
			return countInstagramLikeForUserWeek(userObject.get('fbUserId'), challenge);
		}).then(function (total_like) {
			userJson['total_like'] = total_like;
			usersArray.push(userJson);
		});
		return promise2;
	}).then(function () {
		promise.resolve(usersArray);
	}, function (error) {
		promise.resolve(usersArray);
	});
	return promise;
}

function countInstagramLikeForUserWeek(fbUserId, challenge, callback) {

	var startDate = challenge.get('startTime');
	var endDate = challenge.get('endTime');
	var startDateTimestamp = challenge.get('startDateTimestamp');
	var endDateTimestamp = challenge.get('endDateTimestamp');
	var fbStartDateTimestamp = challenge.get('fbStartDateTimestamp');
	var fbEndDateTimestamp = challenge.get('fbEndDateTimestamp');
	var incrementalWeek = challenge.get('incrementalWeek');

	console.log('countInstagramLikeForUserWeek fbUserId: ' + fbUserId + ' , startDate: ' + startDate + ' , endDate: ' + endDate + ' , incrementalWeek: ' + incrementalWeek);


	var total_like = 0;

	var promise = new Parse.Promise();

	var today = new Date();
	if (challenge.get('accepted') == true && today.getTime() > endDate.getTime() && today.getTime() < endDate.getTime()) {
		Parse.Cloud.useMasterKey();
		var userQuery = new Parse.Query(Parse.User);
		userQuery.equalTo("fbUserId", fbUserId);
		userQuery.first
			({
				success: function (user) {

					console.log(user.get('name'));
					total_like = 0;
					var instagramAccessToken = user.get('instagramAccessToken');
					if (instagramAccessToken != null) {
						var path = 'https://api.instagram.com/v1/users/self/media/recent?count=200&access_token=' + instagramAccessToken;
						Parse.Cloud.httpRequest({
							url: path
						}).then(function (httpResponse) {
							if (httpResponse.data != undefined) {
								var feeds = httpResponse.data.data;

								for (var i = 0; i < feeds.length; i++) {
									if (feeds[i].created_time >= fbStartDateTimestamp && feeds[i].created_time <= fbEndDateTimestamp) {
										total_like = total_like + feeds[i].likes.count;
									}
								}

								return total_like;
							} else {
								return total_like;
							}

						}).then(function (total_like) {

							var queryLike = new Parse.Query("Like");
							queryLike.equalTo('user', user);
							queryLike.equalTo('incrementalWeek', incrementalWeek)
							queryLike.find({
								success: function (results_likes) {

									console.log('results_likes ' + results_likes);
									var like;
									if (results_likes.length > 0) {
										like = results_likes[0];
										if (like.get('LikeCount') != total_like) {
										} else {
											like = null;
										}
									} else {
										var Like = Parse.Object.extend("Like");
										like = new Like();
									}

									if (like != null) {
										like.set("user", user);
										like.set("LikeCountInstagram", total_like);
										like.set("startTime", startDate);
										like.set("endTime", endDate);
										like.set("startDateTimestamp", startDateTimestamp);
										like.set("endDateTimestamp", endDateTimestamp);
										like.set("incrementalWeek", incrementalWeek);
										like.set("fbStartDateTimestamp", fbStartDateTimestamp);
										like.set("fbEndDateTimestamp", fbEndDateTimestamp);

										like.save({
											success: function (user) {
												promise.resolve(total_like);
											},
											error: function (error) {
												promise.resolve(0);
											}
										});
									} else {
										promise.resolve(total_like);
									}
								},
								error: function (error) {
									promise.resolve(0);
								}
							});



						});
					} else {
						var queryLike = new Parse.Query("Like");
						queryLike.equalTo('user', user);
						queryLike.equalTo('incrementalWeek', incrementalWeek)
						queryLike.find({
							success: function (results_likes) {
								var total_like = 0;
								var like;
								if (results_likes.length > 0) {
									like = results_likes[0];
									if (like.get('LikeCount') != total_like) {
									} else {
										like = null;
									}
								} else {
									var Like = Parse.Object.extend("Like");
									like = new Like();
								}

								if (like != null) {
									like.set("user", user);
									like.set("LikeCountInstagram", total_like);
									like.set("startTime", startDate);
									like.set("endTime", endDate);
									like.set("startDateTimestamp", startDateTimestamp);
									like.set("endDateTimestamp", endDateTimestamp);
									like.set("incrementalWeek", incrementalWeek);
									like.set("fbStartDateTimestamp", fbStartDateTimestamp);
									like.set("fbEndDateTimestamp", fbEndDateTimestamp);

									like.save({
										success: function (user) {
											promise.resolve(total_like);
										},
										error: function (error) {
											promise.resolve(0);
										}
									});
								} else {
									promise.resolve(total_like);
								}
							},
							error: function (error) {
								promise.resolve(0);
							}
						});
					}

				},
				error: function () {
					promise.resolve(0);
				}
			});





		return promise;
	} else {
		promise.resolve(0);
		return promise;
	}


}

function countLikeForUsersChallenge(challenge, callback) {
	var fbUsersId = challenge.relation('users');
	console.log(JSON.stringify(fbUsersId));


	var startDate = challenge.get('startTime');
	var endDate = challenge.get('endTime');
	var incrementalWeek = challenge.get('incrementalWeek');

	console.log('countLikeForUsersChallenge fbUsersId.length: ' + fbUsersId.length + ' , startDate: ' + startDate + ' , endDate: ' + endDate + ' , incrementalWeek: ' + incrementalWeek);

	var usersArray = new Array();
	var promise = new Parse.Promise();

	//recupero tutti gli user object
	var query = fbUsersId.query();
	query.each(function (userObject) {
		console.log("userObject " + userObject.get('name'));
		var userJson = {};
		userJson['fbUserId'] = userObject.get('fbUserId');
		userJson['name'] = userObject.get('name');

		var promise2 = Parse.Promise.as();
		promise2 = promise2.then(function () {
			return countLikeForUserWeek(userObject.get('fbUserId'), challenge);
		}).then(function (total_like) {
			userJson['total_like'] = total_like;
			usersArray.push(userJson);
		});
		return promise2;
	}).then(function () {
		promise.resolve(usersArray);
	}, function (error) {
		promise.resolve(usersArray);
	});
	return promise;
}

function countLikeForUserWeek(fbUserId, challenge, callback) {

	var startDate = challenge.get('startTime');
	var endDate = challenge.get('endTime');
	var startDateTimestamp = challenge.get('startDateTimestamp');
	var endDateTimestamp = challenge.get('endDateTimestamp');
	var fbStartDateTimestamp = challenge.get('fbStartDateTimestamp');
	var fbEndDateTimestamp = challenge.get('fbEndDateTimestamp');
	var incrementalWeek = challenge.get('incrementalWeek');

	console.log('countLikeForUserWeek fbUserId: ' + fbUserId + ' , startDate: ' + startDate + ' , endDate: ' + endDate + ' , incrementalWeek: ' + incrementalWeek);


	var total_like = 0;

	var promise = new Parse.Promise();
	var today = new Date();
	if (challenge.get('accepted') == true && today.getTime() > endDate.getTime() && today.getTime() < endDate.getTime()) {
		Parse.Cloud.useMasterKey();
		var userQuery = new Parse.Query(Parse.User);
		userQuery.equalTo("fbUserId", fbUserId);
		userQuery.first
			({
				success: function (user) {
					var fbUserAccessToken = user.get('fbUserAccessToken')
					var path = 'https://graph.facebook.com/v2.6/me?fields=feed.since(' + fbStartDateTimestamp + ').until(' + fbEndDateTimestamp + ').limit(100){picture,type,attachments,from,likes.summary(1)}&access_token=' + fbUserAccessToken;
					total_like = 0;
					Parse.Cloud.httpRequest({
						url: path
					}).then(function (httpResponse) {
						if (httpResponse.data.feed != undefined) {
							var feeds = httpResponse.data.feed.data;

							for (var i = 0; i < feeds.length; i++) {
								if (feeds[i].type == "photo" && feeds[i].from.id == user.get('fbUserId')) {
									total_like = total_like + feeds[i].likes.summary.total_count;
								}
							}

							return total_like;
						} else {
							return total_like;
						}
					}).then(function (total_like) {

						var queryLike = new Parse.Query("Like");
						queryLike.equalTo('user', user);
						queryLike.equalTo('incrementalWeek', incrementalWeek)
						queryLike.find({
							success: function (results_likes) {
								var like;
								if (results_likes.length > 0) {
									like = results_likes[0];
									console.log("***************** LikeCountInstagram " + like.get('LikeCountInstagram'));
									total_like = total_like + like.get('LikeCountInstagram');
									console.log('***************+* total_like ' + total_like);
									if (like.get('LikeCount') != total_like) {
									} else {
										like = null;
									}
								} else {
									var Like = Parse.Object.extend("Like");
									like = new Like();
									console.log("***************** LikeCountInstagram " + like.get('LikeCountInstagram'));
									total_like = total_like + like.get('LikeCountInstagram');
									console.log('***************+* total_like ' + total_like);
								}

								if (like != null) {
									like.set("user", user);
									like.set("LikeCount", total_like);
									like.set("startTime", startDate);
									like.set("endTime", endDate);
									like.set("startDateTimestamp", startDateTimestamp);
									like.set("endDateTimestamp", endDateTimestamp);
									like.set("incrementalWeek", incrementalWeek);
									like.set("fbStartDateTimestamp", fbStartDateTimestamp);
									like.set("fbEndDateTimestamp", fbEndDateTimestamp);

									like.save({
										success: function (user) {
											promise.resolve(total_like);
										},
										error: function (error) {
											promise.resolve(0);
										}
									});
								} else {
									promise.resolve(total_like);
								}
							},
							error: function (error) {
								promise.resolve(0);
							}
						});



					});
				},
				error: function () {
					promise.resolve(0);
				}
			});

		return promise;
	} else {
		promise.resolve(0);
		return promise;
	}


}

function getUser(objectId) {
	console.log("objectId " + objectId);
	Parse.Cloud.useMasterKey();
	var userQuery = new Parse.Query(Parse.User);
	userQuery.equalTo("objectId", objectId);
	userQuery.first
		({
			success: function (user) {
				console.log("user " + user);
				return user;
			},
			error: function () {
				console.log("user " + null);
				return;
			}
		});
}


Parse.Cloud.define("doCreateChallenge", function (request, response) {

	var typeChallenge = request.params.typeChallenge;
	var typeDate = request.params.typeDate;
	var fbUsersId = request.params.fbUsersId;
	var fbAdminUsersId = request.params.fbAdminUsersId;

	var startDate = request.params.startDate;
	var endDate = request.params.endDate;
	var startDateTimestamp = request.params.startDateTimestamp;
	var endDateTimestamp = request.params.endDateTimestamp;
	var fbStartDateTimestamp = request.params.fbStartDateTimestamp;
	var fbEndDateTimestamp = request.params.fbEndDateTimestamp;
	var incrementalWeek = request.params.incrementalWeek;
	var fbEventId = request.params.fbEventId;

	var jsonResponse = {};
	var parseUserObject = [];

	//recupero tutti gli user object
	Parse.Cloud.useMasterKey();
	var userQuery = new Parse.Query(Parse.User);
	userQuery.containedIn("fbUserId", fbUsersId);
	userQuery.find({
		success: function (results) {
			for (var i = 0; i < results.length; i++) {
				parseUserObject.push(results[i]);
			}
		},
		error: function (error) {
			console.log("Error: " + error.code + " " + error.message);
			response.error("script failed with error.code: " + error.code + " error.message: " + error.message);
		}
	}).then(function () {

		if (parseUserObject.length >= 2) {
			var Challenge = Parse.Object.extend("Challenge");
			challenge = new Challenge();

			var relationUsers = challenge.relation("users");
			for (var i = 0; i < parseUserObject.length; i++) {
				relationUsers.add(parseUserObject[i]);
			}

			challenge.set("accepted", false);
			challenge.set("startTime", startDate);
			challenge.set("endTime", endDate);
			challenge.set("startDateTimestamp", startDateTimestamp);
			challenge.set("endDateTimestamp", endDateTimestamp);
			challenge.set("incrementalWeek", incrementalWeek);
			challenge.set("fbStartDateTimestamp", fbStartDateTimestamp);
			challenge.set("fbEndDateTimestamp", fbEndDateTimestamp);
			challenge.set("fbEventId", fbEventId);

			challenge.save({
				success: function (challenge) {
					jsonResponse['status'] = 1;
					response.success(jsonResponse);

				},
				error: function (error) {
					console.log('save error');
					response.error("script failed with error.code: " + error.code + " error.message: " + error.message);

				}
			});
		} else {
			console.log('parseUserObject.length < 2');
			response.error("parseUserObject.length < 2");
		}

	}, function (error) {
		response.error("script failed with error.code: " + error.code + " error.message: " + error.message);
	});

})

Parse.Cloud.define("doReturnMyChallenge", function (request, response) {


	var fbUserId = request.params.fbUserId;
	var responseArray = new Array();
	var usersChallenge = new Array();

	var userObject1 = null;
	var userObject2 = null;
	console.log(fbUserId);
	Parse.Cloud.useMasterKey();
	var userQuery = new Parse.Query(Parse.User);
	userQuery.equalTo("fbUserId", fbUserId);
	userQuery.first
		({
			success: function (userRetrieved) {
				userObject1 = userRetrieved;

				var userQuery = new Parse.Query(Parse.User);
				userQuery.equalTo("fbUserId", fbUserId);
				var queryChallenge = new Parse.Query("Challenge");
				queryChallenge.matchesQuery("users", userQuery);
				queryChallenge.find({
					success: function (results_challenge) {
						return Parse.Promise.as().then(function () {
							var promise = Parse.Promise.as();
							_.each(results_challenge, function (challenge) {
								var challengeObject = {};
								promise = promise.then(function () {
									var promise = new Parse.Promise();
									var challengeObject = {};
								}).then(function () {
									return countInstagramLikeForUsersChallenge(challenge);
								}).then(function () {
									return countLikeForUsersChallenge(challenge);
								}).then(function (usersArray) {

									usersChallenge = new Array();
									for (var i = 0; i < usersArray.length; i++) {
										usersChallenge.push(usersArray[i]);
									}

									var incrementalWeek = challenge.get('incrementalWeek');
									var queryLike = new Parse.Query("Like");
									queryLike.equalTo("user", {
										__type: "Pointer",
										className: "_User",
										objectId: userObject1.id
									});
									queryLike.equalTo('incrementalWeek', incrementalWeek);
									return queryLike.find({
										success: function (results_likes) {
											if (results_likes.length > 0) {
												challengeObject['likeCountUser1'] = results_likes[0].get('LikeCount');
											} else {
												challengeObject['likeCountUser1'] = 0;
											}
										},
										error: function (error) {
											console.log("script failed with error.code: " + error.code + " error.message: " + error.message);
											return error;
										}
									});
								}).then(function () {
									var userQuery = new Parse.Query(Parse.User);
									userQuery.equalTo("objectId", userObject1.id);
									return userQuery.first
										({
											success: function (userRetrieved) {
												challengeObject['fbUserId1'] = userRetrieved.get('fbUserId');
											},
											error: function (error) {
												response.error("user fbUserId1 error.code: " + error.code + " error.message: " + error.message);
											}
										});


								}).then(function () {
									challengeObject['usersChallenge'] = usersChallenge;
									challengeObject['username1'] = userObject1.get('name');
									challengeObject['pfUserId1'] = userObject1.id;
									challengeObject['id'] = challenge.id;
									challengeObject['type'] = challenge.get('type');
									challengeObject['group1'] = challenge.get('group1');
									challengeObject['group2'] = challenge.get('group2');
									challengeObject['startTime'] = challenge.get('startTime');
									challengeObject['endTime'] = challenge.get('endTime');
									challengeObject['startDateTimestamp'] = challenge.get('startDateTimestamp');
									challengeObject['endDateTimestamp'] = challenge.get('endDateTimestamp');
									challengeObject['fbStartDateTimestamp'] = challenge.get('fbStartDateTimestamp');
									challengeObject['fbEndDateTimestamp'] = challenge.get('fbEndDateTimestamp');
									challengeObject['incrementalWeek'] = challenge.get('incrementalWeek');
									challengeObject['typeChallenge'] = challenge.get('typeChallenge');
									challengeObject['typeDate'] = challenge.get('typeDate');
									challengeObject['accepted'] = challenge.get('accepted');
									responseArray.push(challengeObject);
									return Parse.Promise.as();
								});
							});
							return promise;
						}).then(function () {
							response.success(responseArray);
						}, function (error) {
							response.error("script failed with error.code: " + error.code + " error.message: " + error.message);
						});

					},
					error: function (error) {
						console.log('query find error');
						response.error("user results_challenge error.code: " + error.code + " error.message: " + error.message);
					}
				});

			},
			error: function () {
				console.log("error queryBusiness");
				response.error("error queryBusiness");
			}
		});
});

Parse.Cloud.job("countLikeMe", function (request, status) {

	var startDate = getMonday(new Date());
	startDate.setHours(00);
	startDate.setMinutes(00);
	startDate.setSeconds(01);
	var startDateTimestamp = startDate.getTime();
	var fbStartDateTimestamp = Math.round(startDate.getTime() / 1000);

	var endDate = new Date()
	endDate.setDate(startDate.getDate() + 7);
	endDate.setHours(23);
	endDate.setMinutes(59);
	endDate.setSeconds(59);
	var endDateTimestamp = endDate.getTime();
	var fbEndDateTimestamp = Math.round(endDate.getTime() / 1000);
	//console.log('endDate ' + endDate);

	var month = startDate.getUTCMonth() + 1; //months from 1-12
	var day = startDate.getUTCDate();
	var year = startDate.getUTCFullYear();
	var incrementalWeek = year + month + day;
	//console.log('month ' + month);
	//console.log('day ' + day);
	//console.log('year ' + year);
	//console.log('incrementalWeek ' + incrementalWeek);

	Parse.Cloud.useMasterKey();
	var query = new Parse.Query(Parse.User);
	query.find().then(function (users) {
		var promises = [];
		_.each(users, function (user) {
			promises.push((function (user) {
				var promise = new Parse.Promise();
				countLikeForUser(user.get('fbUserId'), {
					success: function (returnValue) {
						console.log('returnValue ' + returnValue);
						return returnValue;
					},
					error: function (error) {
						console.log('error count1');
						return error;
					}
				});
				return promise;
			})(user));
		});
		return Parse.Promise.when(promises);
	})
		.then(function () {
			status.success('like count updated');
		}, function (error) {
			status.error('error like count updated');
		});
});


function countLikeForUser(fbUserId, callback) {

	//console.log("getFriday: " + getFriday(new Date()));
	//console.log("getMonday: " + getMonday(new Date()));

	var startDate = getMonday(new Date());
	startDate.setHours(00);
	startDate.setMinutes(00);
	startDate.setSeconds(01);
	var startDateTimestamp = startDate.getTime();
	var fbStartDateTimestamp = Math.round(startDate.getTime() / 1000);
	//console.log('startDate ' + startDate);

	var endDate = new Date()
	endDate.setDate(startDate.getDate() + 7);
	endDate.setHours(23);
	endDate.setMinutes(59);
	endDate.setSeconds(59);
	var endDateTimestamp = endDate.getTime();
	var fbEndDateTimestamp = Math.round(endDate.getTime() / 1000);
	//console.log('endDate ' + endDate);

	var month = startDate.getUTCMonth() + 1; //months from 1-12
	var day = startDate.getUTCDate();
	var year = startDate.getUTCFullYear();
	var incrementalWeek = year + month + day;
	//console.log('month ' + month);
	//console.log('day ' + day);
	//console.log('year ' + year);
	//console.log('incrementalWeek ' + incrementalWeek);

	var total_like = 0;

	Parse.Cloud.useMasterKey();
	var userQuery = new Parse.Query(Parse.User);
	userQuery.equalTo("fbUserId", fbUserId);
	userQuery.first
		({
			success: function (user) {

				console.log(user.get('name'));

				var fbUserAccessToken = user.get('fbUserAccessToken')
				var path = 'https://graph.facebook.com/v2.6/me?fields=feed.since(' + fbStartDateTimestamp + ').limit(100){picture,type,attachments,from,likes.summary(1)}&access_token=' + fbUserAccessToken;
				total_like = 0;
				console.log('path ' + path);
				Parse.Cloud.httpRequest({
					url: path
				}).then(function (httpResponse) {
					if (httpResponse.data.feed != undefined) {
						console.log('feed count ' + httpResponse.data.feed.data.length + ' name: ' + user.get('name'));
						var feeds = httpResponse.data.feed.data;

						for (var i = 0; i < feeds.length; i++) {
							console.log('type ' + feeds[i].type);
							if (feeds[i].type == "photo" && feeds[i].from.id == user.get('fbUserId')) {
								total_like = total_like + feeds[i].likes.summary.total_count;
							}
						}

						return total_like;
					} else {
						console.log("error httpResponse.data.feed undefined")
						return total_like;
					}
				}).then(function (total_like) {

					console.log("startDateTimestamp " + startDateTimestamp)
					console.log('endDateTimestamp ' + endDateTimestamp);
					console.log('startDate ' + startDate);

					var queryLike = new Parse.Query("Like");
					queryLike.equalTo('user', user);
					//queryLike.greaterThanOrEqualTo('startTime', startDate);
					//queryLike.lessThanOrEqualTo('endTime', endDate);
					queryLike.equalTo('incrementalWeek', incrementalWeek)
					queryLike.find({
						success: function (results_likes) {

							console.log('results_likes ' + results_likes);
							var like;
							if (results_likes.length > 0) {
								console.log('found like');
								like = results_likes[0];
								console.log("like1 " + like)
								console.log('LikeCount ' + like.get('LikeCount'));
								console.log('total_like ' + total_like);
								if (like.get('LikeCount') != total_like) {
									console.log('aggiorno LikeCount');
								} else {
									console.log('aggiornamento LikeCount non necessario');
									like = null;
								}
							} else {
								console.log('new like');
								var Like = Parse.Object.extend("Like");
								like = new Like();
							}

							if (like != null) {
								console.log("like2 " + like)
								console.log('total_like ' + total_like);
								like.set("user", user);
								like.set("LikeCount", total_like);
								like.set("startTime", startDate);
								like.set("endTime", endDate);
								like.set("startDateTimestamp", startDateTimestamp);
								like.set("endDateTimestamp", endDateTimestamp);
								like.set("incrementalWeek", incrementalWeek);
								like.set("fbStartDateTimestamp", fbStartDateTimestamp);
								like.set("fbEndDateTimestamp", fbEndDateTimestamp);

								like.save({
									success: function (user) {
										console.log('save ok');
										//response.success('save ok');
										callback.success(total_like);
									},
									error: function (error) {
										console.log('save error');
										//response.error('save error');
										callback.error("Error");
									}
								});
							} else {
								console.log('like == null');
								//response.success('save ok');
								callback.success(total_like);
							}
						},
						error: function (error) {
							console.log('query find error');
							//response.error('save error');
							callback.error("Error");
						}
					});



				});
			},
			error: function () {
				console.log("error queryBusiness");
				//response.error("error queryBusiness");
				callback.error("Error");
			}
		});



}
