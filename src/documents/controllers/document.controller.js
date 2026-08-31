import * as documentService from "../services/document.service.js";

export const listDocuments = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: await documentService.listDocuments(req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

export const createDocument = async (req, res, next) => {
  try {
    const document = await documentService.createDocument(
      req.user.id,
      req.body,
    );
    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadDocument = async (req, res, next) => {
  try {
    const document = await documentService.getDocument(
      req.user.id,
      req.params.id,
    );
    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    await documentService.deleteDocument(req.user.id, req.params.id);
    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
