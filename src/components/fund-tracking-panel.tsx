"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Filter, Eye, EyeOff, Plus } from "lucide-react";
import { createClient } from "../../supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createFundSourceAction } from "@/app/actions";
import { canManageBudgetsSync, canViewFinancesSync } from "@/utils/permissions";

interface FundSource {
  id: string;
  name: string;
  amount: number;
  currency: string;
  is_restricted: boolean;
  status: string;
  received_date: string;
  donor_name?: string;
  project_name?: string;
  restrictions?: string;
}

interface FundTrackingPanelProps {
  userRole: string;
}

export default function FundTrackingPanel({
  userRole = "admin",
}: FundTrackingPanelProps) {
  const [funds, setFunds] = useState<FundSource[]>([]);
  const [filteredFunds, setFilteredFunds] = useState<FundSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBy, setFilterBy] = useState("all");
  const [showRestricted, setShowRestricted] = useState(true);
  const [showUnrestricted, setShowUnrestricted] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddDonorDialog, setShowAddDonorDialog] = useState(false);
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [donors, setDonors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [newDonor, setNewDonor] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    type: "individual",
    notes: "",
  });
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    total_budget: "",
    status: "active",
  });
  const supabase = createClient();

  const getDefaultCurrency = () => {
    try {
      const savedDefaultCurrency = localStorage.getItem("ngo_default_currency");
      if (savedDefaultCurrency) {
        const defaultCurrency = JSON.parse(savedDefaultCurrency);
        return defaultCurrency.code;
      }
    } catch (error) {
      console.error("Error getting default currency:", error);
    }
    return "USD"; // fallback
  };

  useEffect(() => {
    fetchFunds();
    fetchDonors();
    fetchProjects();
    checkPermissions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [funds, filterBy, showRestricted, showUnrestricted]);

  const checkPermissions = async () => {
    try {
      // Use the state-based approach since you're already tracking canManage in state
      const result = canManageBudgetsSync();
      setCanManage(result);
    } catch (error) {
      console.error("Error checking permissions:", error);
      setCanManage(false);
    }
  };

  const fetchFunds = async () => {
    try {
      const { data, error } = await supabase.from("fund_sources").select(`
          *,
          donors(name),
          projects(name)
        `);

      if (error) throw error;

      const formattedFunds =
        data?.map((fund) => ({
          ...fund,
          donor_name: fund.donors?.name || "Unknown Donor",
          project_name: fund.projects?.name || "General Fund",
        })) || [];

      setFunds(formattedFunds);
    } catch (error) {
      console.error("Error fetching funds:", error);
      setFunds([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDonors = async () => {
    try {
      const { data, error } = await supabase.from("donors").select("id, name");
      if (error) throw error;
      setDonors(data || []);
    } catch (error) {
      console.error("Error fetching donors:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name");
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const applyFilters = () => {
    let filtered = funds;

    // Filter by restriction type
    if (!showRestricted) {
      filtered = filtered.filter((fund) => !fund.is_restricted);
    }
    if (!showUnrestricted) {
      filtered = filtered.filter((fund) => fund.is_restricted);
    }

    // Filter by status or other criteria
    if (filterBy !== "all") {
      filtered = filtered.filter((fund) => fund.status === filterBy);
    }

    setFilteredFunds(filtered);
  };

  const getTotalAmount = (restricted?: boolean) => {
    const relevantFunds =
      restricted !== undefined
        ? funds.filter((fund) => fund.is_restricted === restricted)
        : funds;
    return relevantFunds.reduce((sum, fund) => sum + fund.amount, 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received":
        return "bg-green-100 text-green-800";
      case "partially_used":
        return "bg-yellow-100 text-yellow-800";
      case "fully_used":
        return "bg-gray-100 text-gray-800";
      case "pledged":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white">
        <div className="text-gray-500">Loading fund data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Total Funds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {getDefaultCurrency()}
              {getTotalAmount().toLocaleString()}
            </div>
            <p className="text-xs text-green-700 mt-1">
              {funds.length} funding sources
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Restricted Funds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {getDefaultCurrency()}
              {getTotalAmount(true).toLocaleString()}
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {funds.filter((f) => f.is_restricted).length} restricted sources
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">
              Unrestricted Funds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {getDefaultCurrency()}
              {getTotalAmount(false).toLocaleString()}
            </div>
            <p className="text-xs text-purple-700 mt-1">
              {funds.filter((f) => !f.is_restricted).length} unrestricted
              sources
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Fund Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="partially_used">Partially Used</SelectItem>
                  <SelectItem value="fully_used">Fully Used</SelectItem>
                  <SelectItem value="pledged">Pledged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant={showRestricted ? "default" : "outline"}
                size="sm"
                onClick={() => setShowRestricted(!showRestricted)}
                className="flex items-center gap-2"
              >
                {showRestricted ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                Restricted
              </Button>
              <Button
                variant={showUnrestricted ? "default" : "outline"}
                size="sm"
                onClick={() => setShowUnrestricted(!showUnrestricted)}
                className="flex items-center gap-2"
              >
                {showUnrestricted ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                Unrestricted
              </Button>

              {canManage && (
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Fund
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Fund Source</DialogTitle>
                      <DialogDescription>
                        Create a new funding source for your organization
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      action={createFundSourceAction}
                      className="space-y-4"
                      onSubmit={() => {
                        setTimeout(() => {
                          fetchFunds();
                          setShowAddDialog(false);
                        }, 1000);
                      }}
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Fund Name *</Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="Enter fund name"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount *</Label>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="currency">Currency</Label>
                          <Select
                            name="currency"
                            defaultValue={getDefaultCurrency()}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                              <SelectItem value="RWF">RWF</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="donor_id">Donor</Label>
                          <div className="flex gap-2">
                            <Select name="donor_id">
                              <SelectTrigger>
                                <SelectValue placeholder="Select donor" />
                              </SelectTrigger>
                              <SelectContent>
                                {donors.map((donor) => (
                                  <SelectItem key={donor.id} value={donor.id}>
                                    {donor.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowAddDonorDialog(true)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="project_id">Project</Label>
                          <div className="flex gap-2">
                            <Select name="project_id">
                              <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                              </SelectTrigger>
                              <SelectContent>
                                {projects.map((project) => (
                                  <SelectItem
                                    key={project.id}
                                    value={project.id}
                                  >
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowAddProjectDialog(true)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="received_date">Received Date</Label>
                        <Input
                          id="received_date"
                          name="received_date"
                          type="date"
                          defaultValue={new Date().toISOString().split("T")[0]}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is_restricted"
                          name="is_restricted"
                          value="true"
                        />
                        <Label htmlFor="is_restricted">
                          This is a restricted fund (has specific usage
                          requirements)
                        </Label>
                      </div>

                      <div>
                        <Label htmlFor="restrictions">
                          Restrictions (if any)
                        </Label>
                        <Textarea
                          id="restrictions"
                          name="restrictions"
                          placeholder="Describe any restrictions on fund usage..."
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Create Fund Source</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Project Dialog */}
      <Dialog
        open={showAddProjectDialog}
        onOpenChange={setShowAddProjectDialog}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
            <DialogDescription>
              Create a new project for your organization
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const { error } = await supabase.from("projects").insert({
                  name: newProject.name,
                  description: newProject.description || null,
                  start_date: newProject.start_date || null,
                  end_date: newProject.end_date || null,
                  total_budget: parseFloat(newProject.total_budget) || null,
                  status: newProject.status,
                });

                if (error) throw error;

                // Refresh projects list
                fetchProjects();
                setShowAddProjectDialog(false);
                setNewProject({
                  name: "",
                  description: "",
                  start_date: "",
                  end_date: "",
                  total_budget: "",
                  status: "active",
                });
              } catch (error) {
                console.error("Error creating project:", error);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="project_name">Project Name *</Label>
              <Input
                id="project_name"
                value={newProject.name}
                onChange={(e) =>
                  setNewProject({ ...newProject, name: e.target.value })
                }
                placeholder="Enter project name"
                required
              />
            </div>

            <div>
              <Label htmlFor="project_description">Description</Label>
              <Textarea
                id="project_description"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject({ ...newProject, description: e.target.value })
                }
                placeholder="Enter project description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project_start_date">Start Date</Label>
                <Input
                  id="project_start_date"
                  type="date"
                  value={newProject.start_date}
                  onChange={(e) =>
                    setNewProject({ ...newProject, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="project_end_date">End Date</Label>
                <Input
                  id="project_end_date"
                  type="date"
                  value={newProject.end_date}
                  onChange={(e) =>
                    setNewProject({ ...newProject, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project_budget">Total Budget</Label>
                <Input
                  id="project_budget"
                  type="number"
                  step="0.01"
                  value={newProject.total_budget}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      total_budget: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="project_status">Status</Label>
                <Select
                  value={newProject.status}
                  onValueChange={(value) =>
                    setNewProject({ ...newProject, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddProjectDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Project</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Donor Dialog */}
      <Dialog open={showAddDonorDialog} onOpenChange={setShowAddDonorDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Donor</DialogTitle>
            <DialogDescription>
              Create a new donor for your organization
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const { error } = await supabase.from("donors").insert({
                  name: newDonor.name,
                  contact_email: newDonor.contact_email || null,
                  contact_phone: newDonor.contact_phone || null,
                  address: newDonor.address || null,
                  type: newDonor.type,
                  notes: newDonor.notes || null,
                });

                if (error) throw error;

                // Refresh donors list
                fetchDonors();
                setShowAddDonorDialog(false);
                setNewDonor({
                  name: "",
                  contact_email: "",
                  contact_phone: "",
                  address: "",
                  type: "individual",
                  notes: "",
                });
              } catch (error) {
                console.error("Error creating donor:", error);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="donor_name">Donor Name *</Label>
              <Input
                id="donor_name"
                value={newDonor.name}
                onChange={(e) =>
                  setNewDonor({ ...newDonor, name: e.target.value })
                }
                placeholder="Enter donor name"
                required
              />
            </div>

            <div>
              <Label htmlFor="donor_type">Donor Type</Label>
              <Select
                value={newDonor.type}
                onValueChange={(value) =>
                  setNewDonor({ ...newDonor, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="foundation">Foundation</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="donor_email">Email</Label>
                <Input
                  id="donor_email"
                  type="email"
                  value={newDonor.contact_email}
                  onChange={(e) =>
                    setNewDonor({ ...newDonor, contact_email: e.target.value })
                  }
                  placeholder="donor@example.com"
                />
              </div>
              <div>
                <Label htmlFor="donor_phone">Phone</Label>
                <Input
                  id="donor_phone"
                  value={newDonor.contact_phone}
                  onChange={(e) =>
                    setNewDonor({ ...newDonor, contact_phone: e.target.value })
                  }
                  placeholder="+1234567890"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="donor_address">Address</Label>
              <Textarea
                id="donor_address"
                value={newDonor.address}
                onChange={(e) =>
                  setNewDonor({ ...newDonor, address: e.target.value })
                }
                placeholder="Enter donor address"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="donor_notes">Notes</Label>
              <Textarea
                id="donor_notes"
                value={newDonor.notes}
                onChange={(e) =>
                  setNewDonor({ ...newDonor, notes: e.target.value })
                }
                placeholder="Additional notes about the donor"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDonorDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Donor</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Funds Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fund Sources</CardTitle>
          <CardDescription>
            Detailed view of all funding sources and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fund Name</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFunds.map((fund) => (
                <TableRow key={fund.id}>
                  <TableCell className="font-medium">{fund.name}</TableCell>
                  <TableCell>{fund.donor_name}</TableCell>
                  <TableCell>{fund.project_name}</TableCell>
                  <TableCell className="font-semibold">
                    {fund.currency ===
                    getDefaultCurrency().replace(/[^A-Z]/g, "")
                      ? getDefaultCurrency()
                      : fund.currency}
                    {fund.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={fund.is_restricted ? "destructive" : "secondary"}
                      className={
                        fund.is_restricted
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }
                    >
                      {fund.is_restricted ? "Restricted" : "Unrestricted"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(fund.status)}>
                      {fund.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(fund.received_date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredFunds.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No funds match the current filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}