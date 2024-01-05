//Inherits KnowledgeSet permission and requires a knowledgeSetUuid for each transaction
//Inherits KnowledgeSet permission and requires a knowledgeSetUuid for each transaction


const KnowledgeSet = require('../../models/knowledgeMapping/KnowledgeSet');
const Tag = require('../../models/knowledgeMapping/Tag');
const ApiError = require('../../error/ApiError');
const logger = require('../../middleware/logger');
const uuidv4 = require('uuid').v4;

exports.getTags = async function (req, res, next) {
    try {
        const viewAll = req.body.viewAll || req.query.viewAll || false;
        const username = req?.tokenDecoded?.username || null;
        const roles = req?.tokenDecoded?.roles || [];
        const knowledgeSetUuid = req.body.knowledgeSetUuid || req.query.knowledgeSetUuid;

        let baseQuery = { status: 'active' };

        if (knowledgeSetUuid) {
            const knowledgeSet = await KnowledgeSet.findOne({ uuid: knowledgeSetUuid });
            if (!knowledgeSet) {
                return next(ApiError.notFound("KnowledgeSet not found."));
            }
            const tagUuids = knowledgeSet.tagUuids || [];
            baseQuery = { ...baseQuery, uuid: { $in: tagUuids } };
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

        const tags = await Tag.aggregate(aggregation).sort({'momentUpdated':-1});
        res.status(200).json({ message: "Here are all the active Tags", payload: tags });
    } catch (error) {
        next(ApiError.internal("An error occurred while retrieving Tags"));
    }
};

exports.createTags = async function (req, res, next) {
    try {
        var tagsData = req.body.tags || req.query.tags || [];
        var knowledgeSetUuid = req.body.knowledgeSetUuid || req.query.knowledgeSetUuid; ///this is optional

        console.log(tagsData)
        console.log(knowledgeSetUuid)
        if (!Array.isArray(tagsData)) {
            tagsData = [tagsData];
        }

        // Set the person who created these Tags, if applicable
        tagsData.forEach((tag) => {
            if (req.tokenDecoded) {
                tag.owners = [req.tokenDecoded.username];
                tag.editors = [req.tokenDecoded.username];
                tag.viewers = [req.tokenDecoded.username];
                tag.createdBy = req.tokenDecoded.username;
            }
            //Assign a uuid if not assigned by the UI
            if (!tag.uuid) tag.uuid = uuidv4()
        });

        // Attempt to insert the new Tags
        var results = await Tag.insertMany(tagsData, { runValidators: true });

        var tagUuids = results.map(tag => tag.uuid);


        if (knowledgeSetUuid) {
            // Attempt to update the knowledgeSet with the new Tag UUIDs, ensuring uniqueness
            var knowledgeSetUpdateResult = await KnowledgeSet.updateOne(
                { uuid: knowledgeSetUuid },
                { $addToSet: { tagUuids: { $each: tagUuids } } }
            );

            // Log the update result for debugging
            console.log('KnowledgeSet update result:', knowledgeSetUpdateResult);

            // Check if the knowledgeSet document was found
            if (!knowledgeSetUpdateResult.matchedCount) {
                throw ApiError.internal("KnowledgeSet not found.");
            }

            // If the knowledgeSet update was not successful, remove the inserted Tags
            if (!knowledgeSetUpdateResult.modifiedCount) {
                await Tag.deleteMany({ uuid: { $in: tagUuids } });
                throw ApiError.internal("Failed to update the knowledgeSet with Tag UUIDs.");
            }
        }

        res.status(201).json({ message: "Created all the provided Tags", payload: results });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while creating Tags"));
    }
};


exports.updateTags = async function (req, res, next) {
    try {
        var tagsUpdates = req.body.tags || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(tagsUpdates)) {
            throw ApiError.badRequest("Tags updates should be an array.");
        }

        // Process each Tag update
        for (const update of tagsUpdates) {
            let tag = await Tag.findOne({ uuid: update.uuid });

            if (!tag) {
                throw ApiError.notFound(`Tag with UUID ${update.uuid} not found.`);
            }

            // const isEditor = tag.editors.includes(username);
            // const isAdmin = roles.includes('admin');

            // if (!isEditor && !isAdmin) {
            //     throw ApiError.forbidden("You do not have permission to update this Tag.");
            // }

            // const updateOps = {};
            // for (const [key, value] of Object.entries(update)) {
            //     if (Array.isArray(value)) {
            //         updateOps['$addToSet'] = { [key]: { $each: value } };
            //     } else {
            //         updateOps['$set'] = { [key]: value };
            //     }
            // }

            await Tag.updateOne({ uuid: update.uuid }, update, { runValidators: true });
        }

        res.status(200).json({ message: "Tags updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while updating Tags"));
    }
};


exports.deleteTags = async function (req, res, next) {
    try {
        var tagUuids = req.body.tagUuids || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(tagUuids)) {
            throw ApiError.badRequest("Tag UUIDs should be an array.");
        }

        // Process each Tag UUID for deletion
        for (const uuid of tagUuids) {
            let tag = await Tag.findOne({ uuid: uuid });

            if (!tag) {
                // If the Tag does not exist, skip to the next one
                continue;
            }

            // const isEditor = tag.editors.includes(username);
            // const isAdmin = roles.includes('admin');

            // if (!isEditor && !isAdmin) {
            //     throw ApiError.forbidden("You do not have permission to delete this Tag.");
            // }

            // Delete the Tag
            await Tag.deleteOne({ uuid: uuid });

            // Remove the uuid from the knowledgeSet's tagUuids
            await KnowledgeSet.updateMany(
                { tagUuids: uuid },
                { $pull: { tagUuids: uuid } }
            );
        }

        res.status(200).json({ message: "Tags deleted successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while deleting Tags"));
    }
};

exports.manageRoles = async function (req, res, next) {
    try {
        var { tagUuid, editorsToAdd, editorsToRemove, viewersToAdd, viewersToRemove } = req.body;
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        let tag = await Tag.findOne({ uuid: tagUuid });

        if (!tag) {
            throw ApiError.notFound("Tag not found.");
        }

        const isEditor = tag.editors.includes(username);
        const isAdmin = roles.includes('admin');

        if (!isEditor && !isAdmin) {
            throw ApiError.forbidden("You do not have permission to manage roles for this Tag.");
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

        await Tag.updateOne({ uuid: tagUuid }, updateOps);

        res.status(200).json({ message: "Roles updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while managing roles"));
    }
};