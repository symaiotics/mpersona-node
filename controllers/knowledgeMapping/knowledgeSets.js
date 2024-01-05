

const KnowledgeSet = require('../../models/knowledgeMapping/KnowledgeSet');
const Roster = require('../../models/Roster');
const ApiError = require('../../error/ApiError');
const logger = require('../../middleware/logger');
const uuidv4 = require('uuid').v4;


exports.getKnowledgeSets = async function (req, res, next) {
    try {
        const viewAll = req.body.viewAll || req.query.viewAll || false;
        const username = req?.tokenDecoded?.username || null;
        const roles = req?.tokenDecoded?.roles || [];
        const rosterUuid = req.body.rosterUuid || req.query.rosterUuid;

        let baseQuery = { status: 'active' };

        if (rosterUuid) {
            const roster = await Roster.findOne({ uuid: rosterUuid });
            if (!roster) {
                return next(ApiError.notFound("Roster not found."));
            }
            const knowledgeSetUuids = roster.knowledgeSetUuids || [];
            baseQuery = { ...baseQuery, uuid: { $in: knowledgeSetUuids } };
        } else {
            if (roles.includes('admin') && viewAll) {
                baseQuery = baseQuery;
            } else if (username) {
                baseQuery = {
                    ...baseQuery,
                    $or: [
                        { owners: username },
                        { editors: username },
                        { viewers: username },
                        { publishStatus: 'published' }
                    ]
                };
            } else {
                baseQuery = {
                    ...baseQuery,
                    publishStatus: 'published'
                };
            }
        }

        const aggregation = [
            { $match: baseQuery },
            {
                $addFields: {
                    isOwner: username ? { $in: [username, { $ifNull: ["$owners", []] }] } : false,
                    isEditor: username ? { $in: [username, { $ifNull: ["$editors", []] }] } : false,
                    isViewer: username ? { $in: [username, { $ifNull: ["$viewers", []] }] } : false,
                    isAdmin: { $literal: roles.includes('admin') }
                }
            }
        ];

        if (!roles.includes('admin')) {
            aggregation.push({
                $project: {
                    owners: 0,
                    editors: 0,
                    viewers: 0
                }
            });
        }

        const knowledgeSets = await KnowledgeSet.aggregate(aggregation).sort({'momentUpdated':-1});
        res.status(200).json({ message: "Here are all the active knowledge sets", payload: knowledgeSets });
    } catch (error) {
        next(ApiError.internal("An error occurred while retrieving knowledge sets"));
    }
};

exports.createKnowledgeSets = async function (req, res, next) {
    try {
        var knowledgeSetsData = req.body.knowledgeSets || req.query.knowledgeSets || [];
        var rosterUuid = req.body.rosterUuid || req.query.rosterUuid; ///this is optional

        console.log(knowledgeSetsData)
        console.log(rosterUuid)
        if (!Array.isArray(knowledgeSetsData)) {
            knowledgeSetsData = [knowledgeSetsData];
        }

        // Set the person who created these knowledge sets, if applicable
        knowledgeSetsData.forEach((knowledgeSet) => {
            if (req.tokenDecoded) {
                knowledgeSet.owners = [req.tokenDecoded.username];
                knowledgeSet.editors = [req.tokenDecoded.username];
                knowledgeSet.viewers = [req.tokenDecoded.username];
                knowledgeSet.createdBy = req.tokenDecoded.username;
            }
            //Assign a uuid if not assigned by the UI
            if (!knowledgeSet.uuid) knowledgeSet.uuid = uuidv4()
        });

        // Attempt to insert the new knowledge sets
        var results = await KnowledgeSet.insertMany(knowledgeSetsData, { runValidators: true });

        var knowledgeSetUuids = results.map(knowledgeSet => knowledgeSet.uuid);


        if (rosterUuid) {
            // Attempt to update the roster with the new knowledge set UUIDs, ensuring uniqueness
            var rosterUpdateResult = await Roster.updateOne(
                { uuid: rosterUuid },
                { $addToSet: { knowledgeSetUuids: { $each: knowledgeSetUuids } } }
            );

            // Log the update result for debugging
            console.log('Roster update result:', rosterUpdateResult);

            // Check if the roster document was found
            if (!rosterUpdateResult.matchedCount) {
                throw ApiError.internal("Roster not found.");
            }

            // If the roster update was not successful, remove the inserted knowledge sets
            if (!rosterUpdateResult.modifiedCount) {
                await KnowledgeSet.deleteMany({ uuid: { $in: knowledgeSetUuids } });
                throw ApiError.internal("Failed to update the roster with knowledge set UUIDs.");
            }
        }

        res.status(201).json({ message: "Created all the provided knowledge sets", payload: results });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while creating knowledge sets"));
    }
};


exports.updateKnowledgeSets = async function (req, res, next) {
    try {
        var knowledgeSetsUpdates = req.body.knowledgeSets || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(knowledgeSetsUpdates)) {
            throw ApiError.badRequest("Knowledge sets updates should be an array.");
        }

        // Process each knowledge set update
        for (const update of knowledgeSetsUpdates) {
            let knowledgeSet = await KnowledgeSet.findOne({ uuid: update.uuid });

            if (!knowledgeSet) {
                throw ApiError.notFound(`Knowledge set with UUID ${update.uuid} not found.`);
            }

            const isEditor = knowledgeSet.editors.includes(username);
            const isAdmin = roles.includes('admin');

            // if (!isEditor && !isAdmin) {
            //     throw ApiError.forbidden("You do not have permission to update this knowledge set.");
            // }

            // const updateOps = {};
            // for (const [key, value] of Object.entries(update)) {
            //     if (Array.isArray(value)) {
            //         updateOps['$addToSet'] = { [key]: { $each: value } };
            //     } else {
            //         updateOps['$set'] = { [key]: value };
            //     }
            // }

            await KnowledgeSet.updateOne({ uuid: update.uuid }, update);
        }

        res.status(200).json({ message: "Knowledge sets updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while updating knowledge sets"));
    }
};


exports.deleteKnowledgeSets = async function (req, res, next) {
    try {
        var knowledgeSetUuids = req.body.knowledgeSetUuids || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];
        console.log("Delete", knowledgeSetUuids)

        if (!Array.isArray(knowledgeSetUuids)) {
            throw ApiError.badRequest("Knowledge set UUIDs should be an array.");
        }

        // Process each knowledge set UUID for deletion
        for (const uuid of knowledgeSetUuids) {
            let knowledgeSet = await KnowledgeSet.findOne({ uuid: uuid });

            if (!knowledgeSet) {
                // If the knowledge set does not exist, skip to the next one
                continue;
            }

            const isEditor = knowledgeSet.editors.includes(username);
            const isAdmin = roles.includes('admin');

            if (!isEditor && !isAdmin) {
                throw ApiError.forbidden("You do not have permission to delete this knowledge set.");
            }

            // Delete the knowledge set
            let madeInactive = await KnowledgeSet.updateOne({uuid:uuid}, {$set:{status:'inactive'}})
            console.log('madeInactive', madeInactive)
            // await KnowledgeSet.deleteOne({ uuid: uuid });

            // Remove the uuid from the roster's knowledgeSetUuids
            await Roster.updateMany(
                { knowledgeSetUuids: uuid },
                { $pull: { knowledgeSetUuids: uuid } }
            );
        }

        res.status(200).json({ message: "Knowledge sets deleted successfully." });
    } catch (error) {
        console.log(error)
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while deleting knowledge sets"));
    }
};

exports.manageRoles = async function (req, res, next) {
    try {
        var { knowledgeSetUuid, editorsToAdd, editorsToRemove, viewersToAdd, viewersToRemove } = req.body;
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        let knowledgeSet = await KnowledgeSet.findOne({ uuid: knowledgeSetUuid });

        if (!knowledgeSet) {
            throw ApiError.notFound("Knowledge set not found.");
        }

        const isEditor = knowledgeSet.editors.includes(username);
        const isAdmin = roles.includes('admin');

        if (!isEditor && !isAdmin) {
            throw ApiError.forbidden("You do not have permission to manage roles for this knowledge set.");
        }

        const updateOps = {};
        if (editorsToAdd && editorsToAdd.length) {
            updateOps['$addToSet'] = { editors: { $each: editorsToAdd } };
        }
        if (editorsToRemove && editorsToRemove.length) {
            updateOps['$pullAll'] = { editors: editorsToRemove };
        }
        if (viewersToAdd && viewersToAdd.length) {
            updateOps['$addToSet'] = { ...updateOps['$addToSet'], viewers: { $each: viewersToAdd } };
        }
        if (viewersToRemove && viewersToRemove.length) {
            updateOps['$pullAll'] = { ...updateOps['$pullAll'], viewers: viewersToRemove };
        }

        await KnowledgeSet.updateOne({ uuid: knowledgeSetUuid }, updateOps);

        res.status(200).json({ message: "Roles updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while managing roles"));
    }
};