//Inherits KnowledgeSet permission and requires a knowledgeSetUuid for each transaction

const KnowledgeSet = require('../../models/knowledgeMapping/KnowledgeSet');
const Segment = require('../../models/knowledgeMapping/Segment');
const ApiError = require('../../error/ApiError');
const logger = require('../../middleware/logger');
const uuidv4 = require('uuid').v4;

exports.getSegments = async function (req, res, next) {
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
            const segmentUuids = knowledgeSet.segmentUuids || [];
            baseQuery = { ...baseQuery, uuid: { $in: segmentUuids } };
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

        const segments = await Segment.aggregate(aggregation).sort({ 'momentUpdated': -1 });
        res.status(200).json({ message: "Here are all the active Segments", payload: segments });
    } catch (error) {
        next(ApiError.internal("An error occurred while retrieving Segments"));
    }
};

exports.createSegments = async function (req, res, next) {
    try {
        var segmentsData = req.body.segments || req.query.segments || [];
        var knowledgeSetUuid = req.body.knowledgeSetUuid || req.query.knowledgeSetUuid; ///this is optional

        console.log("DD", segmentsData)
        console.log("KnowledgeSetUuid", knowledgeSetUuid)
        if (!Array.isArray(segmentsData)) {
            segmentsData = [segmentsData];
        }

        // Set the person who created these Segments, if applicable
        segmentsData.forEach((segment) => {
            if (req.tokenDecoded) {
                segment.owners = [req.tokenDecoded.username];
                segment.editors = [req.tokenDecoded.username];
                segment.viewers = [req.tokenDecoded.username];
                segment.createdBy = req.tokenDecoded.username;
            }
            //Assign a uuid if not assigned by the UI
            if (!segment.uuid) segment.uuid = uuidv4()
        });

        // Attempt to insert the new Segments
        var results = await Segment.insertMany(segmentsData, { runValidators: true });

        var segmentUuids = results.map(segment => segment.uuid);


        if (knowledgeSetUuid) {
            // Attempt to update the knowledgeSet with the new Segment UUIDs, ensuring uniqueness
            var knowledgeSetUpdateResult = await KnowledgeSet.updateOne(
                { uuid: knowledgeSetUuid },
                { $addToSet: { segmentUuids: { $each: segmentUuids } } }
            );

            // Log the update result for debugging
            console.log('KnowledgeSet update result:', knowledgeSetUpdateResult);

            // Check if the knowledgeSet segment was found
            if (!knowledgeSetUpdateResult.matchedCount) {
                throw ApiError.internal("KnowledgeSet not found.");
            }

            // If the knowledgeSet update was not successful, remove the inserted Segments
            if (!knowledgeSetUpdateResult.modifiedCount) {
                await Segment.deleteMany({ uuid: { $in: segmentUuids } });
                throw ApiError.internal("Failed to update the knowledgeSet with Segment UUIDs.");
            }
        }

        res.status(201).json({ message: "Created all the provided Segments", payload: results });
    } catch (error) {
        console.log(error)
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while creating Segments"));
    }
};


exports.updateSegments = async function (req, res, next) {
    try {
        var segmentUpdates = req.body.segments || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(segmentUpdates)) {
            throw ApiError.badRequest("Segments updates should be an array.");
        }

        // Process each Segment update
        for (const update of segmentUpdates) {
            let segment = await Segment.findOne({ uuid: update.uuid });

            if (!segment) {
                throw ApiError.notFound(`Segment with UUID ${update.uuid} not found.`);
            }

            const isEditor = segment.editors.includes(username);
            const isAdmin = roles.includes('admin');

            // if (!isEditor && !isAdmin) {
            //     throw ApiError.forbidden("You do not have permission to update this Segment.");
            // }

            // const updateOps = {};
            // for (const [key, value] of Object.entries(update)) {
            //     if (Array.isArray(value)) {
            //         updateOps['$addToSet'] = { [key]: { $each: value } };
            //     } else {
            //         updateOps['$set'] = { [key]: value };
            //     }
            // }

            await Segment.updateOne({ uuid: update.uuid }, update);
        }

        res.status(200).json({ message: "Segments updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while updating Segments"));
    }
};

exports.addRemoveTags = async function (req, res, next) {
    try {
        var operation = req.body.operation || 'add';
        var tagsToAdd = req.body.tags || [];
        var segmentUpdates = req.body.segments || [];

        if (!Array.isArray(segmentUpdates)) {
            throw ApiError.badRequest("Segments updates should be an array.");
        }

        // Process each Segment update
        for (const update of segmentUpdates) {
            let segment = await Segment.findOne({ uuid: update.uuid });

            if (!segment) {
                throw ApiError.notFound(`Segment with UUID ${update.uuid} not found.`);
            }

            let tagUuids = tagsToAdd.map((tag) => tag.uuid);
            let updateQuery = {};

            if (operation === 'add') {
                updateQuery = { $addToSet: { tagUuids: { $each: tagUuids } } };
            } else {
                updateQuery = { $pull: { tagUuids: { $in: tagUuids } } };
            }

            await Segment.updateOne({ uuid: update.uuid }, updateQuery);
        }

        res.status(200).json({ message: "Segments updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while updating Segments"));
    }
};


exports.deleteSegments = async function (req, res, next) {
    try {
        var segmentUuids = req.body.segmentUuids || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(segmentUuids)) {
            throw ApiError.badRequest("Segment UUIDs should be an array.");
        }

        // Process each Segment UUID for deletion
        for (const uuid of segmentUuids) {
            let segment = await Segment.findOne({ uuid: uuid });

            if (!segment) {
                // If the Segment does not exist, skip to the next one
                continue;
            }

            // const isEditor = segment.editors.includes(username);
            // const isAdmin = roles.includes('admin');

            // if (!isEditor && !isAdmin) {
            //     throw ApiError.forbidden("You do not have permission to delete this Segment.");
            // }

            // Delete the Segment
            // await Segment.deleteOne({ uuid: uuid });
            await Segment.updateOne({uuid:uuid}, {$set:{status:'inactive'}})

            // Remove the uuid from the knowledgeSet's segmentUuids
            await KnowledgeSet.updateMany(
                { segmentUuids: uuid },
                { $pull: { segmentUuids: uuid } }
            );
        }

        res.status(200).json({ message: "Segments deleted successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while deleting Segments"));
    }
};

exports.manageRoles = async function (req, res, next) {
    try {
        var { segmentUuid, editorsToAdd, editorsToRemove, viewersToAdd, viewersToRemove } = req.body;
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        let segment = await Segment.findOne({ uuid: segmentUuid });

        if (!segment) {
            throw ApiError.notFound("Segment not found.");
        }

        const isEditor = segment.editors.includes(username);
        const isAdmin = roles.includes('admin');

        if (!isEditor && !isAdmin) {
            throw ApiError.forbidden("You do not have permission to manage roles for this Segment.");
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

        await Segment.updateOne({ uuid: segmentUuid }, updateOps);

        res.status(200).json({ message: "Roles updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while managing roles"));
    }
};