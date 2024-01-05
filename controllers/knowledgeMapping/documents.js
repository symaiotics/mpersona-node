//Inherits KnowledgeSet permission and requires a knowledgeSetUuid for each transaction

const KnowledgeSet = require('../../models/knowledgeMapping/KnowledgeSet');
const Document = require('../../models/knowledgeMapping/Document');
const ApiError = require('../../error/ApiError');
const logger = require('../../middleware/logger');
const uuidv4 = require('uuid').v4;

exports.getDocuments = async function (req, res, next) {
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
            const documentUuids = knowledgeSet.documentUuids || [];
            baseQuery = { ...baseQuery, uuid: { $in: documentUuids } };
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

        const documents = await Document.aggregate(aggregation).sort({ 'momentUpdated': -1 });
        res.status(200).json({ message: "Here are all the active Documents", payload: documents });
    } catch (error) {
        next(ApiError.internal("An error occurred while retrieving Documents"));
    }
};

exports.createDocuments = async function (req, res, next) {
    try {
        var documentsData = req.body.documents || req.query.documents || [];
        var knowledgeSetUuid = req.body.knowledgeSetUuid || req.query.knowledgeSetUuid; ///this is optional

        console.log("DD", documentsData)
        console.log("KnowledgeSetUuid", knowledgeSetUuid)
        if (!Array.isArray(documentsData)) {
            documentsData = [documentsData];
        }

        // Set the person who created these Documents, if applicable
        documentsData.forEach((document) => {
            if (req.tokenDecoded) {
                document.owners = [req.tokenDecoded.username];
                document.editors = [req.tokenDecoded.username];
                document.viewers = [req.tokenDecoded.username];
                document.createdBy = req.tokenDecoded.username;
            }
            //Assign a uuid if not assigned by the UI
            if (!document.uuid) document.uuid = uuidv4()
        });

        // Attempt to insert the new Documents
        var results = await Document.insertMany(documentsData, { runValidators: true });

        var documentUuids = results.map(document => document.uuid);


        if (knowledgeSetUuid) {
            // Attempt to update the knowledgeSet with the new Document UUIDs, ensuring uniqueness
            var knowledgeSetUpdateResult = await KnowledgeSet.updateOne(
                { uuid: knowledgeSetUuid },
                { $addToSet: { documentUuids: { $each: documentUuids } } }
            );

            // Log the update result for debugging
            console.log('KnowledgeSet update result:', knowledgeSetUpdateResult);

            // Check if the knowledgeSet document was found
            if (!knowledgeSetUpdateResult.matchedCount) {
                throw ApiError.internal("KnowledgeSet not found.");
            }

            // If the knowledgeSet update was not successful, remove the inserted Documents
            if (!knowledgeSetUpdateResult.modifiedCount) {
                await Document.deleteMany({ uuid: { $in: documentUuids } });
                throw ApiError.internal("Failed to update the knowledgeSet with Document UUIDs.");
            }
        }

        res.status(201).json({ message: "Created all the provided Documents", payload: results });
    } catch (error) {
        console.log(error)
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while creating Documents"));
    }
};


exports.updateDocuments = async function (req, res, next) {
    try {
        var documentUpdates = req.body.documents || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(documentUpdates)) {
            throw ApiError.badRequest("Documents updates should be an array.");
        }

        // Process each Document update
        for (const update of documentUpdates) {
            let document = await Document.findOne({ uuid: update.uuid });

            if (!document) {
                throw ApiError.notFound(`Document with UUID ${update.uuid} not found.`);
            }

            const isEditor = document.editors.includes(username);
            const isAdmin = roles.includes('admin');

            // if (!isEditor && !isAdmin) {
            //     throw ApiError.forbidden("You do not have permission to update this Document.");
            // }

            // const updateOps = {};
            // for (const [key, value] of Object.entries(update)) {
            //     if (Array.isArray(value)) {
            //         updateOps['$addToSet'] = { [key]: { $each: value } };
            //     } else {
            //         updateOps['$set'] = { [key]: value };
            //     }
            // }

            await Document.updateOne({ uuid: update.uuid }, update);
        }

        res.status(200).json({ message: "Documents updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while updating Documents"));
    }
};

exports.addRemoveTags = async function (req, res, next) {
    try {
        var operation = req.body.operation || 'add';
        var tagsToAdd = req.body.tags || [];
        var documentUpdates = req.body.documents || [];

        if (!Array.isArray(documentUpdates)) {
            throw ApiError.badRequest("Documents updates should be an array.");
        }

        // Process each Document update
        for (const update of documentUpdates) {
            let document = await Document.findOne({ uuid: update.uuid });

            if (!document) {
                throw ApiError.notFound(`Document with UUID ${update.uuid} not found.`);
            }

            let tagUuids = tagsToAdd.map((tag) => tag.uuid);
            let updateQuery = {};

            if (operation === 'add') {
                updateQuery = { $addToSet: { tagUuids: { $each: tagUuids } } };
            } else {
                updateQuery = { $pull: { tagUuids: { $in: tagUuids } } };
            }

            await Document.updateOne({ uuid: update.uuid }, updateQuery);
        }

        res.status(200).json({ message: "Documents updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while updating Documents"));
    }
};


exports.deleteDocuments = async function (req, res, next) {
    try {
        var documentUuids = req.body.documentUuids || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(documentUuids)) {
            throw ApiError.badRequest("Document UUIDs should be an array.");
        }

        // Process each Document UUID for deletion
        for (const uuid of documentUuids) {
            let document = await Document.findOne({ uuid: uuid });

            if (!document) {
                // If the Document does not exist, skip to the next one
                continue;
            }

            // const isEditor = document.editors.includes(username);
            // const isAdmin = roles.includes('admin');

            // if (!isEditor && !isAdmin) {
            //     throw ApiError.forbidden("You do not have permission to delete this Document.");
            // }

            // Delete the Document
            // await Document.deleteOne({ uuid: uuid });
            await Document.updateOne({uuid:uuid}, {$set:{status:'inactive'}})

            // Remove the uuid from the knowledgeSet's documentUuids
            await KnowledgeSet.updateMany(
                { documentUuids: uuid },
                { $pull: { documentUuids: uuid } }
            );
        }

        res.status(200).json({ message: "Documents deleted successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while deleting Documents"));
    }
};

exports.manageRoles = async function (req, res, next) {
    try {
        var { documentUuid, editorsToAdd, editorsToRemove, viewersToAdd, viewersToRemove } = req.body;
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        let document = await Document.findOne({ uuid: documentUuid });

        if (!document) {
            throw ApiError.notFound("Document not found.");
        }

        const isEditor = document.editors.includes(username);
        const isAdmin = roles.includes('admin');

        if (!isEditor && !isAdmin) {
            throw ApiError.forbidden("You do not have permission to manage roles for this Document.");
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

        await Document.updateOne({ uuid: documentUuid }, updateOps);

        res.status(200).json({ message: "Roles updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while managing roles"));
    }
};