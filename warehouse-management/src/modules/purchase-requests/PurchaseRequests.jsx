import React, { useState } from 'react';
import { Plus, Filter, Download, FileText, Eye, Edit, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import PRForm from './PRForm';
import PRDetails from './PRDetails';
import PREditForm from './PREditForm';
import { useWMS } from '../../context/WMSContext';

const PurchaseRequests = () => {
  const { purchaseRequests, deletePR } = useWMS();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);

  const handleView = (pr) => {
    setSelectedPR(pr);
    setIsViewModalOpen(true);
  };

  const handleEdit = (pr) => {
    setSelectedPR(pr);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (pr) => {
    if (window.confirm(`Are you sure you want to delete PR ${pr.pr_number || pr.prNumber}?`)) {
      const success = await deletePR(pr.id);
      if (success) {
        alert('Purchase Request deleted successfully');
      } else {
        alert('Failed to delete Purchase Request');
      }
    }
  };

  const handleSuccess = () => {
    console.log('Operation completed successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="primary" 
            icon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            New Purchase Request
          </Button>
          <Button variant="outline" icon={Filter}>
            Filter
          </Button>
        </div>
        <Button variant="outline" icon={Download}>
          Export
        </Button>
      </div>

      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PR Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Terms
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!purchaseRequests || purchaseRequests.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-gray-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No purchase requests found</p>
                    <p className="text-sm mt-1">Click "New Purchase Request" to create one</p>
                  </td>
                </tr>
              ) : (
                purchaseRequests.map((pr) => (
                  <tr key={pr.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {pr.pr_number || pr.prNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pr.date ? new Date(pr.date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pr.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pr.supplier || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pr.company_name || pr.companyName || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pr.contact_person || pr.contactPerson || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pr.terms || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pr.items ? pr.items.length : 0} item(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${pr.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : ''}
                        ${pr.status === 'Approved' ? 'bg-green-100 text-green-800' : ''}
                        ${pr.status === 'For Canvass' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${pr.status === 'Cancelled' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {pr.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleView(pr)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleEdit(pr)}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(pr)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="New Purchase Request"
        size="lg"
      >
        <PRForm
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleSuccess}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Purchase Request Details"
        size="lg"
      >
        <PRDetails pr={selectedPR} />
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setIsViewModalOpen(false);
              handleEdit(selectedPR);
            }}
          >
            Edit
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Purchase Request"
        size="lg"
      >
        {selectedPR && (
          <PREditForm
            pr={selectedPR}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={handleSuccess}
          />
        )}
      </Modal>
    </div>
  );
};

export default PurchaseRequests;