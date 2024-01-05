//Inherits KnowledgeSet permission and requires a knowledgeSetUuid for each transaction
const KnowledgeSet = require('../../models/knowledgeMapping/KnowledgeSet');
const Category = require('../../models/knowledgeMapping/Category');
const ApiError = require('../../error/ApiError');
const logger = require('../../middleware/logger');
const uuidv4 = require('uuid').v4;

exports.getCategories = async function (req, res, next) {
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
            const categoryUuids = knowledgeSet.categoryUuids || [];
            baseQuery = { ...baseQuery, uuid: { $in: categoryUuids } };
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

        const categories = await Category.aggregate(aggregation).sort({ 'momentUpdated': -1 });
        res.status(200).json({ message: "Here are all the active Categories", payload: categories });
    } catch (error) {
        next(ApiError.internal("An error occurred while retrieving Categories"));
    }
};

exports.createCategories = async function (req, res, next) {
    try {
        var categoriesData = req.body.categories || req.query.categories || [];
        var knowledgeSetUuid = req.body.knowledgeSetUuid || req.query.knowledgeSetUuid; ///this is optional

        console.log(categoriesData)
        console.log(knowledgeSetUuid)
        if (!Array.isArray(categoriesData)) {
            categoriesData = [categoriesData];
        }

        // Set the person who created these Categories, if applicable
        categoriesData.forEach((category) => {
            if (req.tokenDecoded) {
                category.owners = [req.tokenDecoded.username];
                category.editors = [req.tokenDecoded.username];
                category.viewers = [req.tokenDecoded.username];
                category.createdBy = req.tokenDecoded.username;
            }
            //Assign a uuid if not assigned by the UI
            if (!category.uuid) category.uuid = uuidv4()
        });

        // Attempt to insert the new Categories
        var results = await Category.insertMany(categoriesData, { runValidators: true });

        var categoryUuids = results.map(category => category.uuid);


        if (knowledgeSetUuid) {
            // Attempt to update the knowledgeSet with the new Category UUIDs, ensuring uniqueness
            var knowledgeSetUpdateResult = await KnowledgeSet.updateOne(
                { uuid: knowledgeSetUuid },
                { $addToSet: { categoryUuids: { $each: categoryUuids } } }
            );

            // Log the update result for debugging
            console.log('KnowledgeSet update result:', knowledgeSetUpdateResult);

            // Check if the knowledgeSet document was found
            if (!knowledgeSetUpdateResult.matchedCount) {
                throw ApiError.internal("KnowledgeSet not found.");
            }

            // If the knowledgeSet update was not successful, remove the inserted Categories
            if (!knowledgeSetUpdateResult.modifiedCount) {
                await Category.deleteMany({ uuid: { $in: categoryUuids } });
                throw ApiError.internal("Failed to update the knowledgeSet with Category UUIDs.");
            }
        }

        res.status(201).json({ message: "Created all the provided Categories", payload: results });
    } catch (error) {
        console.log(error)

        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while creating Categories"));
    }
};


exports.updateCategories = async function (req, res, next) {
    try {
        var categoriesUpdates = req.body.categories || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(categoriesUpdates)) {
            throw ApiError.badRequest("Categories updates should be an array.");
        }

        // Process each Category update
        for (const update of categoriesUpdates) {
            let category = await Category.findOne({ uuid: update.uuid });

            if (!category) {
                throw ApiError.notFound(`Category with UUID ${update.uuid} not found.`);
            }

            const isEditor = category.editors.includes(username);
            const isAdmin = roles.includes('admin');

            // if (!isEditor && !isAdmin) {
            //     throw ApiError.forbidden("You do not have permission to update this Category.");
            // }

            // Remove the _id field from the update object
            const { _id, ...updateWithoutId } = update;

            // Perform the update
            await Category.updateOne({ uuid: update.uuid }, { $set: updateWithoutId }, { runValidators: true });
        }

        res.status(200).json({ message: "Categories updated successfully." });
    } catch (error) {
        console.log(error)
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while updating Categories"));
    }
};


exports.deleteCategories = async function (req, res, next) {
    try {
        var categoryUuids = req.body.categoryUuids || [];
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        if (!Array.isArray(categoryUuids)) {
            throw ApiError.badRequest("Category UUIDs should be an array.");
        }

        // Process each Category UUID for deletion
        for (const uuid of categoryUuids) {
            let category = await Category.findOne({ uuid: uuid });

            if (!category) {
                // If the Category does not exist, skip to the next one
                continue;
            }

            // const isEditor = category.editors.includes(username);
            // const isAdmin = roles.includes('admin');

            // if (!isEditor && !isAdmin) {
            //     throw ApiError.forbidden("You do not have permission to delete this Category.");
            // }

            // Delete the Category
            // await Category.deleteOne({ uuid: uuid });
            await Category.updateOne({uuid:uuid}, {$set:{status:'inactive'}})

            // Remove the uuid from the knowledgeSet's categoryUuids
            await KnowledgeSet.updateMany(
                { categoryUuids: uuid },
                { $pull: { categoryUuids: uuid } }
            );
        }

        res.status(200).json({ message: "Categories deleted successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while deleting Categories"));
    }
};

exports.manageRoles = async function (req, res, next) {
    try {
        var { categoryUuid, editorsToAdd, editorsToRemove, viewersToAdd, viewersToRemove } = req.body;
        var username = req.tokenDecoded?.username;
        var roles = req.tokenDecoded?.roles || [];

        let category = await Category.findOne({ uuid: categoryUuid });

        if (!category) {
            throw ApiError.notFound("Category not found.");
        }

        const isEditor = category.editors.includes(username);
        const isAdmin = roles.includes('admin');

        if (!isEditor && !isAdmin) {
            throw ApiError.forbidden("You do not have permission to manage roles for this Category.");
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

        await Category.updateOne({ uuid: categoryUuid }, updateOps);

        res.status(200).json({ message: "Roles updated successfully." });
    } catch (error) {
        next(error instanceof ApiError ? error : ApiError.internal("An error occurred while managing roles"));
    }
};