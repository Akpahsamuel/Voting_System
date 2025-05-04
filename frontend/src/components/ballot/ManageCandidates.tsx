import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Plus, Trash } from "lucide-react";

// Import shadcn components
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Alert, AlertDescription } from "../../components/ui/alert";

// Form schema validation
const candidateSchema = z.object({
  name: z.string().min(1, { message: "Candidate name is required" }),
  description: z.string().min(1, { message: "Candidate description is required" }),
  imageUrl: z.string().optional(),
});

const formSchema = z.object({
  candidates: z.array(candidateSchema).min(1, { message: "At least 1 candidate is required" }),
});

type CandidateInput = z.infer<typeof candidateSchema>;

interface ManageCandidatesProps {
  ballotId: string;
  adminCapId: string | undefined;
  superAdminCapId: string | undefined;
  hasSuperAdminCap: boolean;
  onComplete?: () => void;
}

const ManageCandidates = ({ 
  ballotId, 
  adminCapId, 
  superAdminCapId, 
  hasSuperAdminCap,
  onComplete 
}: ManageCandidatesProps) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const packageId = useNetworkVariable("packageId" as any);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      candidates: [
        { name: "", description: "", imageUrl: "" }
      ]
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!adminCapId && !superAdminCapId) {
      toast.error("Admin capability not found");
      return;
    }

    if (!ballotId) {
      toast.error("Ballot ID is required");
      return;
    }

    setIsLoading(true);

    try {
      // Create a transaction to add all candidates
      const tx = new Transaction();
      
      for (const candidate of values.candidates) {
        if (candidate.imageUrl && candidate.imageUrl.trim() !== "") {
          // Add candidate with image URL
          if (hasSuperAdminCap && superAdminCapId) {
            tx.moveCall({
              target: `${packageId}::ballot::add_candidate_with_image_super`,
              arguments: [
                tx.pure.id(ballotId),
                tx.object(superAdminCapId),
                tx.pure.string(candidate.name),
                tx.pure.string(candidate.description),
                tx.pure.string(candidate.imageUrl),
              ],
            });
          } else if (adminCapId) {
            tx.moveCall({
              target: `${packageId}::ballot::add_candidate_with_image`,
              arguments: [
                tx.pure.id(ballotId),
                tx.object(adminCapId),
                tx.pure.string(candidate.name),
                tx.pure.string(candidate.description),
                tx.pure.string(candidate.imageUrl),
              ],
            });
          }
        } else {
          // Add candidate without image URL
          if (hasSuperAdminCap && superAdminCapId) {
            tx.moveCall({
              target: `${packageId}::ballot::add_candidate_super`,
              arguments: [
                tx.pure.id(ballotId),
                tx.object(superAdminCapId),
                tx.pure.string(candidate.name),
                tx.pure.string(candidate.description),
              ],
            });
          } else if (adminCapId) {
            tx.moveCall({
              target: `${packageId}::ballot::add_candidate`,
              arguments: [
                tx.pure.id(ballotId),
                tx.object(adminCapId),
                tx.pure.string(candidate.name),
                tx.pure.string(candidate.description),
              ],
            });
          }
        }
      }

      signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: (result: SuiTransactionBlockResponse) => {
            toast.success("Candidates added successfully");
            form.reset({
              candidates: [
                { name: "", description: "", imageUrl: "" }
              ]
            });
            setIsLoading(false);
            
            if (onComplete) {
              onComplete();
            }
          },
          onError: (error) => {
            console.error("Failed to add candidates:", error);
            toast.error("Failed to add candidates");
            setIsLoading(false);
          },
        }
      );
    } catch (error) {
      console.error("Error adding candidates:", error);
      toast.error("Failed to add candidates");
      setIsLoading(false);
    }
  };

  const addCandidate = () => {
    const currentCandidates = form.getValues("candidates");
    form.setValue("candidates", [
      ...currentCandidates,
      { name: "", description: "", imageUrl: "" }
    ]);
  };

  const removeCandidate = (index: number) => {
    const currentCandidates = form.getValues("candidates");
    if (currentCandidates.length <= 1) {
      toast.error("At least 1 candidate is required");
      return;
    }
    
    const updatedCandidates = [...currentCandidates];
    updatedCandidates.splice(index, 1);
    form.setValue("candidates", updatedCandidates);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Candidates</CardTitle>
        <CardDescription>
          Add candidates to the ballot
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertDescription>
            Add at least two candidates to enable voting on this ballot.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Candidates</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCandidate}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Candidate
                </Button>
              </div>

              {form.watch("candidates").map((_, index) => (
                <div key={index} className="p-4 border rounded-md space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Candidate {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCandidate(index)}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`candidates.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Candidate name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`candidates.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Candidate description"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`candidates.${index}.imageUrl`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" {...field} />
                        </FormControl>
                        <FormDescription>
                          A URL to an image representing this candidate
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
              {form.formState.errors.candidates && (
                <p className="text-sm font-medium text-red-500">
                  {form.formState.errors.candidates.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Candidates...
                </>
              ) : (
                "Add Candidates"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ManageCandidates;
